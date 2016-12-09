//
// Handler for Lambda requests. Invoked by the entry point.
//
var errors = require('./api/errors');
var events = require('./internal/lambda-events');
var paths = require('./internal/paths');
var Request = require('./api/request');
var strings = require('./internal/strings');
var _ = require('lodash');
var qs = require('qs');

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
  
  function processBody(event) {
    if (event.body) {
      var body = event.body;
      var contentType;
      if (event.headers) {
        _.mapKeys(event.headers, function(value, key) {
          if (key.toLowerCase() === 'content-type') {
            contentType = value;
          }
        });
        switch(contentType) {
          case 'application/javascript':
            body = JSON.parse(event.body);
            break;
          case 'application/json':
            body = JSON.parse(event.body);
            break;
          case 'application/x-www-form-urlencoded': 
            body = qs.parse(event.body);
            break;
          default:
            break;
        }
      }
      return body;
    }
    return event.body;
  }

  event = events.standardizeEvent(app, event, context);
  if (!event) {
    context.done(null, errors.badRequest('Unable to handle event'));
    return;
  }

  var req = new Request({
    app: app,
    environment: event.requestContext.stage,
    lambdaArn: context.invokedFunctionArn,
    method: event.httpMethod,
    path: event.resource,
    headers: event.headers,
    params: event.pathParameters,
    query: event.queryStringParameters,
    body: processBody(event),
    stageVariables: event.stageVariables,
    requestContext: event.requestContext
  });
  
  app._handleRequest(req, function(err, payload) {
    context.done(err, processError(payload));
  });
  
};
