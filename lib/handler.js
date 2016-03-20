//
// Handler for Lambda requests. Invoked by the entry point.
//
var errors = require('./api/errors');
var paths = require('./internal/paths');
var Request = require('./api/request');
var strings = require('./internal/strings');


module.exports = function(app, event, context) {
  var req = new Request({
    method: event.method,
    path: paths.gatewayToExpress(event.path),
    headers: strings.parseAmazonDictionary(event.headerNames, event.headers),
    params: strings.parseAmazonDictionary(event.paramNames, event.params),
    query: strings.parseAmazonDictionary(event.queryNames, event.query),
    body: event.body,
  });

  app._handleRequest(req, function(err, payload) {
    context.done(err, payload);
  });
};
