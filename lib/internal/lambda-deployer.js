var _ = require('lodash');
var async = require('async');
var aws = require('aws-sdk');
var callbacks = require('./callbacks');
var glob = require('glob');
var fs = require('fs');
var JSZip = new require('jszip');
var path = require('path');
var utils = require('../internal/utils');
const repack = require('repack-zip');

var MB = 1024 * 1024;

// File containing the Lambda handler.
var ENTRY_POINT_FILE = '../bootstrap/lambdafai-entry-point.js';

var LambdaDeployer = function(app) {
  this.lambda = new aws.Lambda();
  this.iam = new aws.IAM();
  this.app = app;
};

LambdaDeployer.prototype.deploy = async function(environment, lambdaName, source, callback) {
  var self = this;
  var lambdasToDeploy = self.app.lambdas.filter(function(x) {
    return !lambdaName || x.name == lambdaName;
  });
  console.log('Found ' + lambdasToDeploy.length + ' lambdas to deploy');
  var zipFile = await buildZipFile(source);
  async.eachSeries(lambdasToDeploy, function(lambda, next) {
    self._deployLambda(zipFile, lambda, environment, next);
  }, callback);
};

LambdaDeployer.prototype.promote = function(sourceEnv, targetEnv, callback) {
  var self = this;
  async.waterfall([
    function collectFromVersions(next) {
      self._collectVersions(sourceEnv, false, function(err, versions) {
        self.newVersions = versions;
        next(err);
      });
    },
    function collectToVersions(next) {
      self._collectVersions(targetEnv, true, function(err, versions) {
        self.oldVersions = versions;
        next(err);
      });
    },
    function diff(next) {
      self._computeDiff();
      next();
    },
    function apply(next) {
      if (self.diff.length > 0) {
        console.log('\nApplying changes to environment: ' + targetEnv);
      } else {
        console.log('\nNo changes necessary.');
      }
      async.eachSeries(self.diff, function(entry, cb) {
        self._updateAlias(targetEnv, entry, cb);
      }, next);
    },
  ], callbacks.stripData(callback));
};

// Deployment:

LambdaDeployer.prototype._deployLambda = function(zipFile, lambda, environment, callback) {
  var self = this;
  var functionName = self.app.name + '-' + lambda.name;
  utils.logBanner();
  console.log('Deploying "' + functionName + '" to environment "' + environment + '"');

  var description = 'Lambdafai ' + new Date().toDateString();
  var version;

  async.waterfall([
    function upload(next) {
      console.log('Uploading to ' + functionName + ' Lambda function');
      self.lambda.updateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipFile,
        Publish: true,
      }, next);
    },
    function createAlias(info, next) {
      version = info.Version;
      console.log('Published version ' + version + '. Mapping alias "' + environment + '"');
      self.lambda.createAlias({
        FunctionName: functionName,
        FunctionVersion: version,
        Name: environment,
        Description: description,
      }, callbacks.ignoreErrors('*', next));
    },
    function updateAlias(info, next) {
      self.lambda.updateAlias({
        FunctionName: functionName,
        Name: environment,
        Description: description,
        FunctionVersion: version,
      }, next);
    },
  ], callback);
};

const buildZipFile = async (source) => {
  // Add paths to the zip file:
  let paths;
  if (source === null) {
    let glob = await repack.getGlobPatterns({ cwd: undefined });
    let files = await repack.getFiles({ cwd: undefined });
    paths = await files(glob);
  } else {
    console.log('Deploying from source:', source);
    if (fs.lstatSync(source).isDirectory()) {
      paths = [];
      let files = fs.readdirSync(source);
      files.forEach(file => {
        paths.push(`${source}/${file}`);
      });
    } else {
      paths = [source];
    }
  }

  var zip = new JSZip();
  var numFiles = 0;
  _.forEach(paths, function(path) {
    if (fs.lstatSync(path).isDirectory()) {
      zip.folder(path);
    } else {
      zip.file(path, fs.readFileSync(path));
      numFiles++;
    }
  });

  // Figure out the path of the currently running script. We will require this script when running
  // on Lambda to configure the app.
  var indexPath = path.relative(process.cwd(), process.argv[1]);
  var entry = fs.readFileSync(path.join(__dirname, ENTRY_POINT_FILE), 'utf8');
  entry = entry.replace('$INDEX', './' + indexPath);
  zip.file(path.basename(ENTRY_POINT_FILE), new Buffer(entry, 'utf8'));

  // Generate the zipfile.
  var zipFile = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  console.log('Zipped ' + numFiles + ' files, ' + (zipFile.length / MB).toFixed(2) + ' MB');
  return zipFile;
};

// Promotion:

LambdaDeployer.prototype._collectVersions = function(environment, allowMissing, callback) {
  var self = this;
  var versions = {};
  async.eachSeries(self.app.lambdas, function(lambda, next) {
    var functionName = self.app.name + '-' + lambda.name;
    self.lambda.getAlias({ FunctionName: functionName, Name: environment }, function(err, alias) {
      if (alias) {
        versions[functionName] = alias.FunctionVersion;
      } else if (err && err.code == 'ResourceNotFoundException') {
        console.log('Alias not found: ' + environment);
        if (allowMissing) {
          versions[functionName] = 0;
          err = null;
        }
      }
      next(err);
    });
  }, function(err) {
    callback(err, versions);
  });
};

LambdaDeployer.prototype._computeDiff = function() {
  var self = this;
  self.diff = [];
  _.forEach(self.app.lambdas, function(lambda) {
    var name = self.app.name + '-' + lambda.name;
    var oldVersion = self.oldVersions[name] || 0;
    var newVersion = self.newVersions[name];
    if (oldVersion !== newVersion) {
      self.diff.push({ name: name, oldVersion: oldVersion, newVersion: newVersion });
    }
  });
};

LambdaDeployer.prototype._updateAlias = function(alias, diff, callback) {
  if (diff.oldVersion === 0) {
    console.log('  ' + diff.name + ': Create alias "' + alias + '" for version ' + diff.newVersion);
    this.lambda.createAlias({
      FunctionName: diff.name,
      Name: alias,
      FunctionVersion: diff.newVersion,
    }, callback);
  } else {
    console.log('  ' + diff.name + ': Update alias "' + alias + '" for version ' + diff.newVersion);
    this.lambda.updateAlias({
      FunctionName: diff.name,
      Name: alias,
      FunctionVersion: diff.newVersion,
    }, callback);
  }
};

module.exports = LambdaDeployer;
