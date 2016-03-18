var _ = require('lodash');
var async = require('async');
var aws = require('aws-sdk');
var glob = require('glob');
var fs = require('fs');
var JSZip = new require('jszip');
var path = require('path');
var utils = require('../internal/utils');

var MB = 1024 * 1024;

// Files to ignore when matching.
var IGNORE_PATTERNS = [
  'build/**',
  'spec/**',
  'test/**',
  'node_modules/gulp*/**',
  'node_modules/aws-sdk/**',
];

var ENTRY_POINT_FILE = '../bootstrap/lambdafai-entry-point.js';


function buildZipFile() {
  // Find the paths to add to the zip file.
  var paths = glob.sync('**', { ignore: IGNORE_PATTERNS });

  // Add paths to the zip file.
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

  // Add the Lambdafai entry point file.
  var indexPath = path.relative(process.cwd(), process.argv[1]);
  var entry = fs.readFileSync(path.join(__dirname, ENTRY_POINT_FILE), 'utf8');
  entry = entry.replace('$INDEX', indexPath);
  zip.file(path.basename(ENTRY_POINT_FILE), new Buffer(entry, 'utf8'));

  // Generate the zipfile.
  var zipFile = zip.generate({type: 'nodebuffer'});
  console.log('Zipped ' + numFiles + ' files, ' + (zipFile.length / MB).toFixed(2) + ' MB');
  return zipFile;
}

function deployFunction(lambda, functionName, environment, done) {
  console.log('Deploying ' + functionName + ' to environment "' + environment + '"');

  var description = 'Lambdafai ' + new Date().toDateString();
  var zipFile = buildZipFile();
  var version;

  async.waterfall([
    function upload(next) {
      console.log('Uploading...');
      lambda.updateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipFile,
        Publish: true,
      }, next);
    },
    function createAlias(info, next) {
      version = info.Version;
      console.log('Published version ' + version + '. Mapping alias "' + environment + '"');
      lambda.createAlias({
        FunctionName: functionName,
        FunctionVersion: version,
        Name: environment,
        Description: description,
      }, utils.ignoringErrorCodes('*', next));
    },
    function alias(info, next) {
      lambda.updateAlias({
        FunctionName: functionName,
        Name: environment,
        Description: description,
        FunctionVersion: version,
      }, next);
    },
  ], done);
}

module.exports = {
  description: 'Deploys all Lambdas to a given environment.',

  execute: function(app, args, callback) {
    if (args.environment.indexOf('prod') >= 0 || args.environment.indexOf('staging') >= 0) {
      callback(new Error('Refusing to deploy directly to "' + args.environment + '". ' +
                         'Use the "promote" command instead.'));
      return;
    }

    var awsLambda = new aws.Lambda({ region: args.region });
    async.eachSeries(_.values(app.lambdas), function(lambda, next) {
      var name = app.name + '-' + lambda.name;
      deployFunction(awsLambda, name, args.environment, next);
    }, callback);
  },
};
