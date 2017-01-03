var _ = require('lodash');

/**
 * Represents a request. These are passed to handlers and middleware, and are constructed by
 * the framework for HTTP and S3 requests. You should not call this constructor directly, except
 * from tests.
 *
 * @constructor
 * @property {Application} app the current Application
 * @property {string} environment name of the environment that we are running in, e.g. `dev`
 * @property {string} lambdaArn the ARN of the Lambda function invocation
 * @property {method} method name of the HTTP method, e.g. `POST`
 * @property {string} path path of the request URL, without host or query string e.g. `/items/123`
 * @property {hash} headers HTTP headers, e.g. `{"Content-Type": "application/json"}`
 * @property {hash} params Path parameters, e.g. if the path template is `/items/:id` and the
 *                  request path is `/items/123`, params will be `{"id": "123"}`
 * @property {query} query Query parameters, e.g. `/items?foo=bar` => `{"foo": "bar"}`
 * @property {object} body Request body as a JS object
 */
var Request = function(opts) {
  this.app = opts.app;
  this.environment = opts.environment;
  this.lambdaArn = opts.lambdaArn;
  this.method = opts.method || 'GET';
  this.path = opts.path || '';
  this.headers = opts.headers || {};
  this.params = opts.params || {};
  this.query = opts.query || {};
  this.body = opts.body || {};
  this.stageVariables = opts.stageVariables || {};
  this.requestContext = opts.requestContext || {};
  this.claims = opts.claims || {};
  this.apiGateway = opts.apiGateway || false;
};

/**
 * Returns the full name of the DynamoDB table for the current app and environment.
 *
 * @param {string} name the short name of the table
 */
Request.prototype.tableName = function(name) {
  if (this.app && this.app.name && this.environment && name) {
    return this.app.name + '-' + this.environment + '-' + name;
  }
};

/** Returns the full name of the ACL for the current app and environment. */
Request.prototype.aclName = function() {
  return this.tableName('acl');
};

/**
 * Returns the full name of the S3 bucket for the current app and environment.
 *
 * @param {string} name the short name of the bucket
 */
Request.prototype.bucketName = function(name) {
  if (this.app && this.app.name && this.environment && name) {
    return this.app.name + '-' + this.environment + '-' + name;
  }
};

module.exports = Request;
