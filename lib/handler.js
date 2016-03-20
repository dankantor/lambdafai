//
// Handler for Lambda requests. Invoked by the entry point.
//
var paths = require('./internal/paths');
var Request = require('./api/request');
var Response = require('./api/response');
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

  var res = new Response({}, context.done);

  // Try to find a handler to handle the request.
  var route = app.findRoute(req.method, req.path);
  if (!route) {
    context.done(new Error('HTTP 404: Not Found'));
  } else {
    route.handler(req, res);
  }
};
