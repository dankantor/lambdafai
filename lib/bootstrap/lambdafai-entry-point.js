//
// Entry point invoked by Lambda. This gets dynamically added to each Lambda zipfile and is used
// to bootstrap the configuration process before handling off to handler.js
//

var lambdafai = require('lambdafai');

var app;
var handler;

// Tell lambdafai that we are running on Lambda and supply it with a callback to invoke once the
// the app is loaded.
lambdafai._ENTRY_POINT_CALLBACK = function(_app, _handler) {
  app = _app;
  handler = _handler;
};

// Have the app configure itself.
require('$INDEX');

// This is the entry point invoked by AWS Lambda. Delegate to the handler defined in handler.js.
exports.handler = function(event, context) {
  handler(app, event, context);
};
