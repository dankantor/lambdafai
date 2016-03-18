var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Request = require('../api/request');
var Response = require('../api/response');
var rjson = require('relaxed-json');
var utils = require('../utils');

var DEFAULT_HEADERS = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'User-Agent': 'invoke.js',
  'Host': 'localhost',
};

function loadRequest(request) {
  var opts;
  if (fs.existsSync(request)) {
    opts = rjson.parse(fs.readFileSync(request, 'utf8'));
  } else {
    opts = rjson.parse(request);  // Try to parse as a literal.
  }
  opts.headers = opts.headers || DEFAULT_HEADERS;
  return new Request(opts);
}

function findRoute(lambda, method, path) {
  for (var i = 0; i < lambda.routes.length; i++) {
    var route = lambda.routes[i];
    if (route.method == method && route.path == path) {
      return route;
    }
  }
}

function matchRequest(app, req) {
  var lambdas = _.values(app.lambdas);
  for (var i = 0; i < lambdas.length; i++) {
    var route = findRoute(lambdas[i], req.method, req.path);
    if (route) {
      return { lambda: lambdas[i], route: route };
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
    var req = loadRequest(args.request);
    var match = matchRequest(app, req);
    if (!match) {
      callback(new Error('No route matches: ' + req.method + ' ' + req.path));
      return;
    }

    console.log('Invoking Lambda: ' + match.lambda.name);
    console.log('Request: ' + JSON.stringify(req));
    utils.logSeparator();
    match.route.handler(req, new Response({}, callback));
  },
};
