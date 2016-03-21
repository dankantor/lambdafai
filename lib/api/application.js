var _ = require('lodash');
var async = require('async');
var errors = require('./errors');
var Lambda = require('./lambda');
var Response = require('./response');
var strings = require('../internal/strings');


var Application = function(name) {
  strings.checkIdentifier(name, 'app name');
  this.name = name;
  this.useACL = false;
  this.handlers = [];
  this.tables = [];
  this.lambdas = [];
  this.buckets = [];
};

Application.prototype.table = function(opts) {
  strings.checkIdentifier(opts.name, 'table name');
  checkUniqueName(this.tables, opts.name, 'tables');
  this.tables.push({
    name: opts.name,
    key: opts.key,
  });
};

Application.prototype.lambda = function(opts) {
  var lambda = new Lambda(this, opts);
  checkUniqueName(this.lambdas, lambda.name, 'lambdas');
  this.lambdas.push(lambda);
  this.handlers.push({
    type: 'lambda',
    name: lambda.name,
    handler: lambda._handleRequest.bind(lambda),
  });
  return lambda;
};

Application.prototype.bucket = function(opts) {
  strings.checkIdentifier(opts.name, 'bucket name');
  checkUniqueName(this.buckets, opts.name, 'buckets');
  this.buckets.push({
    name: opts.name,
    acl: opts.acl || 'private'
  });
};

Application.prototype.use = function(middleware) {
  this.handlers.push({ type: 'middleware', handler: middleware });
};

Application.prototype._handleRequest = function(req, callback) {
  var res = new Response();
  async.eachSeries(this.handlers, function(handler, next) {
    res._callback = next;
    handler.handler(req, res);
  }, function() {
    if (!res.isDone) {
      callback(errors.notFound());  // Nobody handled the request.
    } else {
      // At this point, the entire Lambda & middleware chain has been invoked. Extract the error
      // or payload from the response object and pass it up to the callback.
      callback(res.error, res.error ? undefined : res.payload);
    }
  });
}

function checkUniqueName(array, name, description) {
  if (_.find(array, { name: name })) {
    throw new Error('Multiple ' + description + ' are named "' + name + '" in application');
  }
}

module.exports = Application;
