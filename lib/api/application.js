var _ = require('lodash');
var async = require('async');
var errors = require('./errors');
var Lambda = require('./lambda');
var Response = require('./response');
var strings = require('../internal/strings');

/**
 * The Application object represents the Lambdafai application It is passed into the configuration
 * callback to the {@link lambdafai} function, allowing the application to define its configuration.
 *
 * The Application object has methods for:
 *   * Defining S3 buckets; see {@link Application#bucket}
 *   * Defining DynamoDB tables; see {@link Application#table}
 *   * Defining Lambda functions; see {@link Application#lambda}
 *   * Adding middleware; see {@link Application#use}
 *
 * @constructor
 * @param {string} name - The name of the application; used as a prefix for all resource names
 */
var Application = function(name) {
  strings.checkIdentifier(name, 'app name');
  this.name = name;
  this.useACL = false;
  this.handlers = [];
  this.tables = [];
  this.lambdas = [];
  this.buckets = [];
};

/**
 * Registers a DynamoDB table.
 * @param {object} opts - Options for the table. These can include:
 *   * name - the name of the table (required)
 *   * key - array containing the hash key name and optional range key name
 *   * fullSchema - complete DynamoDB schema the table. Use this if you need more control over the
 *     schema than the defaults provide (for example if you need secondary indices). The value
 *     should be in the same format as is passed to
 *     [createTable]{@link http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#createTable-property}
 *     in the DynamoDB API.
 */
Application.prototype.table = function(opts) {
  strings.checkIdentifier(opts.name, 'table name');
  checkUniqueName(this.tables, opts.name, 'tables');
  this.tables.push({
    name: opts.name,
    key: opts.key,
    fullSchema: opts.fullSchema,
  });
};

/**
 * Registers a Lambda function.
 * @param {object} opts - Options for the Lambda function. These can include:
 *   * name - the name of the function (required)
 *   * description - a text description of the function
 *   * ram - megabytes of RAM for function execution
 *   * timeout - timeout in seconds for function execution
 * @return {Lambda} configuration for the new Lambda function
 */
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

/**
 * Registers an S3 bucket.
 * @param {object} opts - Options for the bucket. These can include:
 *   * name - the name of the function (required)
 *   * acl - access control for the bucket, can be "private", "public-read", "public-read-write",
 *     or "authenticated-read"; see S3 docs for more info
 */
Application.prototype.bucket = function(opts) {
  strings.checkIdentifier(opts.name, 'bucket name');
  checkUniqueName(this.buckets, opts.name, 'buckets');
  this.buckets.push({
    name: opts.name,
    acl: opts.acl || 'private'
  });
};

/**
 * Mounts specified application-level middleware function. Middleware are functions that intercept
 * the request before or after the handler. Middleware must call `res.next()` to pass control to
 * the next middleware in the chain.
 *
 * @param {function} middleware - the middleware function
 */
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
      // or body from the response object and pass it up to the callback.
      callback(res.error, res.error ? undefined : res.body);
    }
  });
}

function checkUniqueName(array, name, description) {
  if (_.find(array, { name: name })) {
    throw new Error('Multiple ' + description + ' are named "' + name + '" in application');
  }
}

module.exports = Application;
