var _ = require('lodash');
var callbacks = require('../internal/callbacks');
var fs = require('fs');
var path = require('path');
var paths = require('../internal/paths');
var Request = require('../api/request');
var Response = require('../api/response');
var rjson = require('relaxed-json');
var url = require('url');
var utils = require('../internal/utils');

var DEFAULT_HEADERS = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'User-Agent': 'Lambdafai invoker',
  'Host': 'localhost',
};

function loadRequest(pathOrLiteral) {
  var opts;
  if (fs.existsSync(pathOrLiteral)) {
    opts = rjson.parse(fs.readFileSync(pathOrLiteral, 'utf8'));
  } else {
    opts = rjson.parse(pathOrLiteral);  // Try to parse as a literal.
  }

  if (!_.isObject(opts) || _.isArray(opts) || _.isString(opts)) {
    console.error('Request must be a JSON object.');
    return null;
  }
  if (!opts.method || !opts.path) {
    console.error('"method" and "path" fields are required in request.');
    return null;
  }

  // Add any caller-supplied headers to the defaults.
  var headers = _.clone(DEFAULT_HEADERS);
  if (opts.headers) {
    _.assign(headers, opts.headers);
  }

  // Parse the path and query out of the path.
  var parsedURL = url.parse('http://localhost' + opts.path, true);

  return {
    method: opts.method,
    path: parsedURL.pathname,
    headers: headers,
    query: parsedURL.query,
    body: opts.body,
  };
}

function findRoute(app, method, path) {
  var routes = _.flatten(app.lambdas.map(function(lambda) { return lambda.routes; }));
  for (var i = 0; i < routes.length; i++) {
    if (routes[i].method == method && paths.matchPath(routes[i].path, path)) {
      return routes[i];
    }
  }
}

module.exports = {
  description: 'Invokes a Lambda locally.',

  configureParser: function(parser) {
    parser.addArgument([ 'request' ], {
      help: 'A request object to send to the lambda, either inline or a JSON file to load.'
    });
  },

  execute: function(app, args, callback) {
    var request = loadRequest(args.request);
    var route = findRoute(app, request.method, request.path);
    if (!route) {
      callback(new Error('No route matches: ' + request.method + ' ' + request.path));
      return;
    }

    // Extract path parameters:
    request.params = paths.matchPath(route.path, request.path);
    request.path = route.path;

    if (args.verbose) {
      utils.logBanner('Request:\n' + JSON.stringify(request, null, 2));
    }

    app._handleRequest(new Request(request), callbacks.logData(callback));
  },
};
