var async = require('async');
var _ = require('lodash');
var paths = require('../internal/paths');
var strings = require('../internal/strings');

/**
 * The Lambda object represents a Lambda function in the application. It is returned by
 * {@link Application#lambda} when a new function is registered. You should not call this
 * constructor directly.
 *
 * The Lambda object has methods for:
 *   * Routing HTTP and S3 requests; see {@link Lambda#get}, {@link Lambda#s3put}, etc.
 *   * Adding middleware; see {@link Lambda#use}
 *
 * @constructor
 */
var Lambda = function(app, opts) {
  strings.checkIdentifier(opts.name, 'lambda name');
  this.name = opts.name;
  this.description = opts.description || (opts.name + ' (generated by Lambdafai)');
  this.ram = opts.ram || 128;
  this.timeout = opts.timeout || 10;
  this.handlers = [];
};

/**
 * Routes HTTP GET requests for a given path to the handler. Paths can include placeholders
 * prefixed with a colon, e.g. `/items/:id`, which will match paths like `/items/123`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.get = function(path, handler, options) {
  this._addHandler({type: 'route', method: 'GET', path: path, handler: handler, options: options });
  return this;
};

/**
 * Routes HTTP POST requests for a given path to the handler. Paths can include placeholders
 * prefixed with a colon, e.g. `/items/:id`, which will match paths like `/items/123`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.post = function(path, handler, options) {
  this._addHandler({type: 'route', method: 'POST', path: path, handler: handler, options: options });
  return this;
};

/**
 * Routes HTTP PUT requests for a given path to the handler. Paths can include placeholders
 * prefixed with a colon, e.g. `/items/:id`, which will match paths like `/items/123`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.put = function(path, handler, options) {
  this._addHandler({type: 'route', method: 'PUT', path: path, handler: handler, options: options });
  return this;
};

/**
 * Routes HTTP DELETE requests for a given path to the handler. Paths can include placeholders
 * prefixed with a colon, e.g. `/items/:id`, which will match paths like `/items/123`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.delete = function(path, handler, options) {
  this._addHandler({type: 'route', method: 'DELETE', path: path, handler: handler, options: options });
  return this;
};

/**
 * Routes HTTP OPTIONS requests for a given path to the handler. Paths can include placeholders
 * prefixed with a colon, e.g. `/items/:id`, which will match paths like `/items/123`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.options = function(path, handler, options) {
  this._addHandler({type: 'route', method: 'OPTIONS', path: path, handler: handler, options: options });
  return this;
};

/**
 * Routes S3 PUT requests for a given path to the handler. S3 paths will be the key in the bucket,
 * and can include placeholders prefixed with a colon, e.g. `/items/:id`
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.s3put = function(path, handler) {
  this._addHandler({type: 'route', method: 'S3PUT', path: path, handler: handler });
  return this;
};

/**
 * Routes SCHEDULED EVENT requests for a given rule to the handler. Rule names will be the path
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.scheduledEvent = function(path, handler) {
  this._addHandler({type: 'route', method: 'SCHEDULEDEVENT', path: path, handler: handler });
  return this;
};

/**
 * Routes API GATEWAY AUTHORIZER EVENT requests for a given rule to the handler. 
 * You must set API Gateway resources manually to use a custom Authorizer
 * AWS Docs - http://docs.aws.amazon.com/apigateway/latest/developerguide/use-custom-authorizer.html
 * Rule names will be the method and path, e.g. '/GET/auth'
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.apiGatewayAuthorizerEvent = function(path, handler) {
  this._addHandler({type: 'route', method: 'APIGATEWAYAUTHORIZEREVENT', path: path, handler: handler });
  return this;
};

/**
 * Routes COGNITO TRIGGER EVENTS requests for a given rule to the handler. 
 * You must set Cognito resources manually to use a custom Trigger
 * AWS Docs - http://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html
 * Rule names will be the method and path, e.g. .cognitoEvent('/PostConfirmation_ConfirmSignUp', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.cognitoEvent = function(path, handler) {
  this._addHandler({type: 'route', method: 'COGNITOEVENT', path: path, handler: handler });
  return this;
};

/**
 * Routes DYNAMODB INSERT EVENTS requests for a given rule to the handler. 
 * You must set DynamoDB resources manually to use a custom Trigger
 * You must set StreamEnabled to true for the DynamoDB table 
 * You must set the Batch Size to 1
 * AWS Docs - http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
 * DynamoDB event names will be the event name, and table name will be the path
 *   e.g. INSERT -> .dynamoDbInsert('/Users', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.dynamoDbInsert = function(path, handler) {
  this._addHandler({type: 'route', method: 'DYNAMODBINSERT', path: path, handler: handler });
  return this;
};

/**
 * Routes KINESIS FIREHOSE EVENTS requests for a given rule to the handler. 
 * You must set Kinesis Firehose resources manually to use a custom Trigger
 * AWS Docs - http://docs.aws.amazon.com/firehose/latest/dev/data-transformation.html
 * Filter name will be the firehose name
 *   e.g. firehose-name -> .kinesisFirehose('/firehose-name', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.kinesisFirehose = function(path, handler) {
  this._addHandler({type: 'route', method: 'KINESISFIREHOSE', path: path, handler: handler });
  return this;
};

/**
 * Routes CLOUDWATCH LOGS EVENTS requests for a given rule to the handler. 
 * You must set CloudWatch resources manually to use a custom Trigger
 * AWS Docs - http://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
 * Filter name will be the event name
 *   e.g. --filter-name my-filter -> .cloudWatchLogs('/my-filter', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.cloudWatchLogs = function(path, handler) {
  this._addHandler({type: 'route', method: 'CLOUDWATCHLOGS', path: path, handler: handler });
  return this;
};

/**
 * Routes DYNAMODB MODIFY EVENTS requests for a given rule to the handler. 
 * You must set DynamoDB resources manually to use a custom Trigger
 * You must set StreamEnabled to true for the DynamoDB table 
 * You must set the Batch Size to 1
 * AWS Docs - http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
 * DynamoDB event names will be the event name, and table name will be the path
 *   e.g. MODIFY -> .dynamoDbModify('/Users', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.dynamoDbModify = function(path, handler) {
  this._addHandler({type: 'route', method: 'DYNAMODBMODIFY', path: path, handler: handler });
  return this;
};

/**
 * Routes LAMBDA INVOKE EVENTS requests for a given rule to the handler. 
 * AWS Docs - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property
 * Invoke like so -
 *   FunctionName: 'MyFunction',
 *   InvocationType: 'Event | RequestResponse | DryRun',
 *   Payload: JSON.stringify({'method': 'lambdaInvoke', 'path': '/hello', 'body': {'foo': 'bar'}}),
 *   Qualifier: req.environment
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.lambdaInvoke = function(path, handler) {
  this._addHandler({type: 'route', method: 'LAMBDAINVOKE', path: path, handler: handler });
  return this;
};

/**
 * Routes SQS EVENTS requests for a given rule to the handler. 
 * You must set SQS resources manually to use a custom Trigger
 * AWS Docs - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
 * SQS event names will be the event name, and table name will be the path
 *   e.g. SQS -> .sqs('/Users', fn)
 * @param path {string} the path to register the handler at
 * @param handler {function} function with signature `function(req, res)` for handling the request
 */
Lambda.prototype.sqs = function(path, handler) {
  this._addHandler({type: 'route', method: 'SQS', path: path, handler: handler });
  return this;
};

/**
 * Mounts specified Lambda-level middleware function. Middleware are functions that intercept
 * the request before or after the handler. Middleware must call `res.next()` to pass control to
 * the next middleware in the chain.
 *
 * @param {function} middleware - the middleware function
 */
Lambda.prototype.use = function(middleware) {
  this._addHandler({type: 'middleware', handler: middleware});
  return this;
};

Lambda.prototype._addHandler = function(handler) {
  if (handler.type == 'route') {
    checkConflictingRoutes(this.handlers, handler);
  }
  if (handler.options === undefined) {
    handler.options = {};
  }
  this.handlers.push(handler);
};

Lambda.prototype._handleRequest = function(req, res) {
  var callback = res._callback;
  var matchingRoutes = _.filter(this.handlers, function(h) {
    return h.type == 'route' && (h.method == req.method && paths.match(h.path, req.path));
  });
  if (matchingRoutes.length === 0 || req.isDone) {
    callback(null);  // No routes matched the request. Move along.
    return;
  }

  var matchingHandlers = _.filter(this.handlers, function(h) {
    return h.type == 'middleware' || (h.method == req.method && paths.match(h.path, req.path));
  });
  async.eachSeries(matchingHandlers, function(handler, next) {
    res._callback = next;
    handler.handler(req, res);
  }, callback);
};

function checkConflictingRoutes(handlers, route) {
  var conflict = _.find(handlers, function(handler) {
    return handler.type == 'route' && handler.method == route.method &&
        (paths.match(handler.path, route.path) || paths.match(route.path, handler.path));
  });
  if (conflict) {
    throw new Error('Route conflict: ' + JSON.stringify(conflict) + ' and ' + JSON.stringify(route));
  }
}

module.exports = Lambda;
