var _ = require('lodash');
var async = require('async');
var aws = require('aws-sdk');
var paths = require('./paths');
var utils = require('./utils');


// Maps fields from API gateway to the event that is passed to Lambda.
var MAPPING_TEMPLATE = {
  method: '$context.httpMethod',
  path: '$context.resourcePath',
  stage: '$context.stage',
  headerNames: '$input.params().header.keySet()',
  headers: '$input.params().header',
  paramNames: '$input.params().path.keySet()',
  params: '$input.params().path',
  queryNames: '$input.params().querystring.keySet()',
  query: '$input.params().querystring',
  body: '{BODY}'
};

// Stringified version, as expected by API gateway.
var templateJson = JSON.stringify(MAPPING_TEMPLATE).replace('"{BODY}"', "$$input.json('$$')");

// Status codes we support:
var HTTP_STATUS_CODES = [ '200', '400', '401', '403', '404', '409', '500', '503', '504' ];

// Given an HTTP status code, returns the selection pattern for that code.
function selectorForStatus(status) {
  if (status === '200') {
    return undefined;
  } else if (status === '504') {
    return 'Task timed out.*';
  } else {
    return 'HTTP ' + status + '.*';
  }
}

var ApiDeployer = function(app) {
  this.gateway = new aws.APIGateway();
  this.iam = new aws.IAM();
  this.app = app;
}

ApiDeployer.prototype.deploy = function(stage, callback) {
  var self = this;
  async.waterfall([
    function(next) { self._lookUpAppID(next); },
    function(next) { self._lookUpUser(next); },
    function(next) { self._acquireLock(next); },
    function(next) { self._buildNewResourceTree(); self._getOldResourceIDs(next); },
    function(next) { self._deleteOldResources(next); },
    function(next) { self._createResources(next); },
    function(next) { self._createDeployment(stage, next); },
    function(next) { self._showSuccessMessage(stage, next); },
  ], function(err) {
    self._releaseLock(function(releaseError) {
      if (releaseError) {
        console.error('Error releasing lock: ' + releaseError);
      }
      callback(err);
    });
  });
};

ApiDeployer.prototype.promote = function(sourceStage, targetStage, callback) {
  var self = this;
  async.waterfall([
    function(next) { self._lookUpAppID(next); },
    function(next) { self._getDeploymentId(sourceStage, next); },
    function(id, next) { self.newDeploymentID = id; self._getDeploymentId(targetStage, next); },
    function(id, next) { self.oldDeploymentID = id; self._promoteIfNeeded(targetStage, next); },
    function(next) { self._showSuccessMessage(targetStage, next); },
  ], utils.strippingData(callback));
};

ApiDeployer.prototype._lookUpAppID = function(callback) {
  var self = this;
  self.gateway.getRestApis({ limit: 500 }, function(err, data) {
    if (!err) {
      var apis = data.items.filter(function(api) { return api.name == self.app.name; });
      if (apis.length > 0) {
        self.apiID = apis[0].id;
        console.log('Found API ID: ' + self.apiID);
        callback();
      } else {
        callback(new Error('Unable to find API with name: ' + self.app.name));
      }
    } else {
      callback(err);
    }
  });
};

ApiDeployer.prototype._lookUpUser = function(callback) {
  var self = this;
  self.iam.getUser(function(err, data) {
    if (!err) {
      self.username = data.User.UserName;
      var arnParts = data.User.Arn.split(':');
      self.accountNumber = arnParts[4];
      self.roleArn = arnParts.slice(0, 5).join(':') + ':role/' + self.app.name + '-role';
      console.log('User: ' + self.username);
      console.log('Role: ' + self.roleArn);
    }
    callback(err);
  });
};

// Deployment:

ApiDeployer.prototype._getOldResourceIDs = function(callback) {
  var self = this;
  self.gateway.getResources({ restApiId: self.apiID, limit: 500 }, function(err, data) {
    if (!err) {
      var roots = data.items.filter(function(res) { return !res.parentId; });
      self.rootResourceID = roots[0].id;
      console.log('Found root resource: ' + self.rootResourceID);

      self.oldTopLevelResourceIDs = data.items.filter(function(res) {
        return res.parentId == self.rootResourceID;
      }).map(function(res) {
        return res.id;
      });
      console.log('Found ' + self.oldTopLevelResourceIDs.length + ' existing top-level resources');
    }
    callback(err);
  });
}

ApiDeployer.prototype._deleteOldResources = function(callback) {
  var self = this;
  async.mapSeries(self.oldTopLevelResourceIDs, function(id, next) {
    console.log('Deleting resource: ' + id);
    self.gateway.deleteResource({ restApiId: self.apiID, resourceId: id }, next);
  }, utils.strippingData(callback));
};

function childForPart(node, part) {
  for (var i = 0; i < node.children.length; i++) {
    if (node.children[i].part == part) {
      return node.children[i];
    }
  }
}

function addRouteToTree(tree, route, lambdaName) {
  var node = tree;
  var parts = paths.splitPath(paths.expressToGateway(route.path));
  for (var i = 0; i < parts.length; i++) {
    var child = childForPart(node, parts[i]);
    if (!child) {
      var path = paths.joinPath(parts.slice(0, i + 1));
      child = { path: path, part: parts[i], children: [], methods: [] };
      node.children.push(child);
    }
    node = child;
  }
  node.methods.push({ method: route.method, lambda: lambdaName });
};

ApiDeployer.prototype._buildNewResourceTree = function() {
  var self = this;
  var tree = { part: '', path: '/', children: [], methods: [] };
  _.forEach(self.app.lambdas, function(lambda) {
    _.forEach(lambda.routes, function(route) {
      var lambdaName = self.app.name + '-' + lambda.name;
      addRouteToTree(tree, route, lambdaName);
    });
  });
  self.newResourceTree = tree;
};

ApiDeployer.prototype._createMethod = function(resourceID, method, lambdaName, callback) {
  var self = this;
  var region = aws.config.region;
  var uri = 'arn:aws:apigateway:' + region + ':lambda:path/2015-03-31/functions/' +
            'arn:aws:lambda:' + region + ':' + self.accountNumber + ':function:' + lambdaName +
            ':${stageVariables.stage}/invocations';

  async.waterfall([
    function createMethod(next) {
      console.log('  - Creating method ' + method);
      self.gateway.putMethod({
        restApiId: self.apiID,
        resourceId: resourceID,
        httpMethod: method,
        authorizationType: 'NONE',
        apiKeyRequired: false,
      }, utils.strippingData(next));
    },
    function createResponses(next) {
      async.mapSeries(HTTP_STATUS_CODES, function(status, cb) {
        console.log('    - Adding response: ' + status);
        self.gateway.putMethodResponse({
          restApiId: self.apiID,
          resourceId: resourceID,
          httpMethod: method,
          statusCode: status
        }, cb);
      }, utils.strippingData(next));
    },
    function createIntegration(next) {
      console.log('    - Creating integration: ' + lambdaName);
      self.gateway.putIntegration({
        restApiId: self.apiID,
        resourceId: resourceID,
        httpMethod: method,
        type: 'AWS',
        integrationHttpMethod: 'POST',
        uri: uri,
        credentials: self.roleArn,
        requestTemplates: {
          'application/json': templateJson
        },
      }, utils.strippingData(next));
    },
    function createIntegrationResponses(next) {
      async.mapSeries(HTTP_STATUS_CODES, function(status, cb) {
        console.log('    - Adding integration response: ' + status);
        self.gateway.putIntegrationResponse({
          restApiId: self.apiID,
          resourceId: resourceID,
          httpMethod: method,
          statusCode: status,
          selectionPattern: selectorForStatus(status),
        }, cb);
      }, utils.strippingData(next));
    },
  ], callback);
};

ApiDeployer.prototype._createNode = function(node, parentID, callback) {
  var self = this;
  var nodeID;
  async.waterfall([
    function createResource(next) {
      if (parentID) {
        console.log('Creating resource for path: ' + node.path);
        self.gateway.createResource({
          restApiId: self.apiID,
          parentId: parentID,
          pathPart: node.part
        }, function(err, resource) {
          next(err, resource ? resource.id : null);
        });
      } else {
        console.log('Root node:');
        next(null, self.rootResourceID);
      }
    },
    function createMethods(resourceID, next) {
      console.log('  - Resource ID: ' + resourceID);
      nodeID = resourceID;
      async.mapSeries(node.methods, function(method, cb) {
        self._createMethod(resourceID, method.method, method.lambda, cb);
      }, next);
    },
  ], function(err) {
    if (err) {
      callback(err);
    } else {
      async.eachSeries(node.children, function(child, next) {
        self._createNode(child, nodeID, next);
      }, callback);
    }
  });
};

ApiDeployer.prototype._createResources = function(callback) {
  this._createNode(this.newResourceTree, null, utils.strippingData(callback));
};

ApiDeployer.prototype._createDeployment = function(stage, callback) {
  var self = this;
  console.log('Deploying to stage: ' + stage);
  self.gateway.createDeployment({
    restApiId: self.apiID,
    stageName: stage,
    description: 'Deployed to "' + stage + '" by ' + self.username,
    variables: { stage: stage },
  }, utils.strippingData(callback));
};

ApiDeployer.prototype._showSuccessMessage = function(stage, callback) {
  var apiID = this.apiID;
  var region = aws.config.region;
  utils.logBanner();
  console.log('\nEndpoint URL:');
  console.log('  https://' + apiID + '.execute-api.' + region + '.amazonaws.com/' + stage);
  callback();
};

// Promotion:

ApiDeployer.prototype._getDeploymentId = function(stageName, callback) {
  this.gateway.getStage({ restApiId: this.apiID, stageName: stageName }, function(err, stage) {
    if (err && err.code === 'NotFoundException') {
      console.error('Stage not found: ' + stageName);
      callback(null, null);
    } else if (err) {
      callback(err);
    } else {
      callback(null, stage.deploymentId);
    }
  });
};

ApiDeployer.prototype._promoteIfNeeded = function(stage, callback) {
  var self = this;
  if (self.oldDeploymentID === self.newDeploymentID) {
    console.log('\nNo changes necessary.');
    callback();
    return;
  } else if (!self.newDeploymentID) {
    callback(new Error('Source stage does not exist!'));
  }

  console.log('\nUpdating deployment for "' + stage + '": ' + self.oldDeploymentID + ' -> ' +
    self.newDeploymentID);

  // Try to create the stage. If it already exists, we'll get an error and then update instead.
  async.waterfall([
    function(next) {
      self.gateway.createStage({
        restApiId: self.apiID,
        stageName: stage,
        deploymentId: self.newDeploymentID,
        variables: { stage: stage }
      }, utils.ignoringErrorCodes('*', next));
    },
    function(_, next) {
      self.gateway.updateStage({
        restApiId: self.apiID,
        stageName: stage,
        patchOperations: [{ op: 'replace', path: '/deploymentId', value: self.newDeploymentID }]
      }, next);
    }
  ], utils.strippingData(callback));
};

// Locking:

// With API Gateway, there is a single shared space where the API is configured, then deployed to
// whatever environment the user selected. Bad things can happen if two people are writing to that
// shared space at the same time. As a result, we try to implement locking by writing to the API's
// description field. There's still a race if two users try to acquire the lock at the same time,
// but at least this is a very tiny window.

var LOCK_TIMEOUT = 60;  // Hold lock for at most 60 seconds.
var LOCK_RE = /^Locked by (.+?) until ([0-9]+?)$/;

ApiDeployer.prototype._acquireLock = function(callback) {
  var self = this;
  var now = Math.floor(_.now() / 1000);
  async.waterfall([
    function getApi(next) {
      self.gateway.getRestApi({ restApiId: self.apiID }, next);
    },
    function checkLock(api, next) {
      var err;
      var match = api.description ? api.description.match(LOCK_RE) : null;
      if (match && parseInt(match[2]) > now) {
        err = new Error('Unable to update API because it is locked by ' + match[1] +
                        ' for the next ' + (parseInt(match[2]) - now).toFixed(0) + ' seconds');
      }
      next(err);
    },
    function writeLock(next) {
      console.log('Acquiring lock with timeout: ' + LOCK_TIMEOUT);
      self._updateDescription('Locked by ' + self.username + ' until ' + (now + LOCK_TIMEOUT), next);
    },
    function storeHasLock(next) {
      self.hasLock = true;
      next();
    }
  ], callback);
};

ApiDeployer.prototype._releaseLock = function(callback) {
  if (this.hasLock) {
    this._updateDescription('', callback);
  } else {
    callback();
  }
};

ApiDeployer.prototype._updateDescription = function(description, callback) {
  var self = this;
  self.gateway.updateRestApi({
    restApiId: self.apiID,
    patchOperations: [{ op: 'replace', path: '/description', value: description }]
  }, utils.strippingData(callback));
};

module.exports = ApiDeployer;
