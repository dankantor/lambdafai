//
// Handler for Lambda requests. Invoked by the entry point.
//
var Request = require('./api/request');
var Response = require('./api/response');

// Parses the stupid format that Amazon uses for dictionaries.
function parseApiGatewayDictionary(namesString, pairsString) {
  namesString = namesString || '[]';
  pairsString = pairsString || '{}';

  var names = namesString.substring(1, namesString.length - 1).split(', ');
  var pairs = pairsString.substring(1, pairsString.length - 1);
  var result = {};

  while (names.length) {
    var name = names.pop();
    var index = pairs.lastIndexOf(name + '=');
    if (index < 0) {
      console.warn('Unable to find name: ' + name);
      return undefined;
    }
    var param = pairs.substring(index);
    var key = param.substring(0, name.length);
    var value = param.substring(name.length + 1);
    result[key] = value;

    pairs = pairs.substring(0, index);
  }
  return result;
}

// Converts the path to an Express-style path.
function normalizePath(path) {
  if (path) {
    var parts = path.split('/');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.length > 2 && part[0] == '{' && part[part.length - 1] == '}') {
        parts[i] = ':' + part.substring(1, part.length - 1);
      }
    }
    path = parts.join('/');
  }
  return path;
}

module.exports = function(app, event, context) {
  var req = new Request({
    method: event.method,
    path: normalizePath(event.path),
    headers: parseApiGatewayDictionary(event.headerNames, event.headers),
    params: parseApiGatewayDictionary(event.paramNames, event.params),
    query: parseApiGatewayDictionary(event.queryNames, event.query),
    body: event.body,
  });

  var res = new Response({}, context.done);

  // Try to find a handler to handle the request.
  var handler = app.findHandler(req.method, req.path);
  if (!handler) {
    context.done(new Error('Not Found'));
  } else {
    handler(req, res);
  }
};
