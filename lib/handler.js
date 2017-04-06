//
// Handler for Lambda requests. Invoked by the entry point.
//
var errors = require('./api/errors');
var events = require('./internal/lambda-events');
var paths = require('./internal/paths');
var Request = require('./api/request');
var strings = require('./internal/strings');
var _ = require('lodash');

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
    context.done(null, errors.badRequest('Unable to handle event'));
    return;
  }

  var req = new Request({
    app: app,
    environment: event.stage,
    lambdaArn: context.invokedFunctionArn,
    method: event.method,
    path: event.path,
    headers: event.headers,
    params: event.params,
    query: event.query,
    body: event.body,
    stageVariables: event.stageVariables,
    requestContext: event.requestContext,
    claims: event.claims,
    apiGateway: event.apiGateway
  });
  
  app._handleRequest(req, function(err, payload) {
    context.done(err, processError(payload));
  });
  
};
