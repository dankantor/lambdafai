//
// Handler for Lambda requests. Invoked by the entry point.
//
var errors = require('./api/errors');
var events = require('./internal/lambda-events');
var paths = require('./internal/paths');
var Request = require('./api/request');
var strings = require('./internal/strings');

module.exports = function(app, event, context) {
  // Wraps unhandled errors, attaches the log stream and request ID from the context, and suppresses
  // stack traces in production environments.
  
  function processError(payload) {
    if (payload.stack) {
      console.log('error stack', payload);
      if (event && event.stageVariables && 
        event.stageVariables.stage && event.stageVariables.stage.indexOf('prod') === -1) {
        payload.body = payload.stack; 
      }
      delete payload.stack;
    }
    return payload;
  }

  event = events.standardizeEvent(app, event, context);
  if (!event) {
    context.succeed(errors.badRequest('Unable to handle event'));
    return;
  }

  var params = strings.parseAmazonDictionary(event.paramNames, event.params);
  var path = paths.substitute(paths.gatewayToExpress(event.path), params);
  var req = new Request({
    app: app,
    environment: event.stageVariables.stage,
    lambdaArn: context.invokedFunctionArn,
    method: event.httpMethod,
    path: path,
    headers: event.headers,
    params: params,
    query: event.queryStringParameters,
    body: event.body
  });
  console.log('req', req);
/*
  var req = new Request({
    app: app,
    environment: event.stage,
    lambdaArn: context.invokedFunctionArn,
    method: event.method,
    path: path,
    headers: strings.parseAmazonDictionary(event.headerNames, event.headers),
    params: params,
    query: strings.parseAmazonDictionary(event.queryNames, event.query),
    body: event.body,
  });
*/

/*
  app._handleRequest(req, function(payload) {
    console.log('handler _handleRequest', payload);
    context.succeed(payload);
  });
*/
  
  app._handleRequest(req, function(err, payload) {
    console.log('handler _handleRequest', err, payload);
    context.done(err, processError(payload));
  });
  
};
