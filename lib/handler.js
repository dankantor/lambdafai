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
  function processError(err) {
    if (err) {
      err = errors.wrap(err);
      err.message += ', request: ' + context.awsRequestId + ', logStream: ' + context.logStreamName;
      if (event && event.stage && event.stage.indexOf('prod') === 0) {
        err.stack = '';
      }
    }
    return err;
  }

  event = events.standardizeEvent(app, event, context);
  if (!event) {
    context.done(processError(errors.badRequest('Unable to handle event')));
    return;
  }

  var params = strings.parseAmazonDictionary(event.paramNames, event.params);
  var path = paths.substitute(paths.gatewayToExpress(event.path), params);
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

  app._handleRequest(req, function(err, payload) {
    context.done(processError(err), payload);
  });
};
