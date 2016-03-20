var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Request = require('../api/request');
var Response = require('../api/response');
var rjson = require('relaxed-json');
var utils = require('../internal/utils');

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

module.exports = {
  description: 'Invokes a Lambda locally.',

  configureParser: function(parser) {
    parser.addArgument([ 'request' ], {
      help: 'A request object to send to the lambda, either inline or a JSON file to load.'
    });
  },

  execute: function(app, args, callback) {
    var req = loadRequest(args.request);
    var handler = app.findHandler(req.method, req.path);
    if (!handler) {
      callback(new Error('No route matches: ' + req.method + ' ' + req.path));
      return;
    }
    utils.logBanner('Request: ' + JSON.stringify(req));
    handler(req, new Response({}, callback));
  },
};
