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
  if (!opts.path) {
    console.error('"path" field is missing in request.');
    return null;
  }

  // Add any caller-supplied headers to the defaults.
  var headers = _.clone(DEFAULT_HEADERS);
  if (opts.headers) {
    _.assign(headers, opts.headers);
  }

  // Parse the path and query out of the path.
  var parsedURL = url.parse('http://localhost' + opts.path, true);
  
  // is this an API Gateway event?
  var apiGateway = false;
  if (opts.method === 'GET' ||
      opts.method === 'POST' ||
      opts.method === 'PUT' ||
      opts.method === 'DELETE') {
    apiGateway = true;      
  }

  return {
    environment: opts.environment,
    lambdaArn: opts.lambdaArn,
    method: opts.method || 'GET',
    path: parsedURL.pathname,
    headers: headers,
    query: parsedURL.query,
    body: opts.body,
    apiGateway: apiGateway
  };
}

function findRoute(app, method, path) {
  return _.find(_.flatten(_.map(app.lambdas, 'handlers')), function(h) {
    return h.type == 'route' && h.method == method && paths.match(h.path, path);
  });
}

module.exports = {
  description: 'Invokes a Lambda locally.',

  configureParser: function(parser) {
    parser.addArgument([ 'environment' ], {
      help: 'Name of the environment to simulate running in, e.g. "dev".'
    });
    parser.addArgument([ 'request' ], {
      help: 'A request object to send to the lambda, either inline or a JSON file to load.'
    });
  },

  execute: function(app, args, callback) {
    var request = loadRequest(args.request);
    request.app = app;
    request.environment = args.environment;

    var route = findRoute(app, request.method, request.path);
    if (!route) {
      callback(new Error('No route matches: ' + request.method + ' ' + request.path));
      return;
    }

    // Extract path parameters:
    request.params = paths.match(route.path, request.path);
    if (args.verbose) {
      utils.logBanner('Request:\n' + JSON.stringify(request, null, 2));
    }

    app._handleRequest(new Request(request), callbacks.logData(callback));
  },
};
