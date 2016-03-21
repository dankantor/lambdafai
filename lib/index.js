var App = require('./api/app');
var commandLineTool = require('./command-line');
var handler = require('./handler');

var lambdafai = function(name, configureAppCallback) {
  var app = new App(name);
  configureAppCallback(app);

  if (lambdafai._ENTRY_POINT_CALLBACK) {
    // We're running in Lambda. Call back into the Lambda Entry Point.
    lambdafai._ENTRY_POINT_CALLBACK(app, handler);
  } else {
    // We're not running in Lambda. Run the command-line interface.
    commandLineTool(app);
  }
};

// This is set by the entry point if we are running in Lambda.
lambdafai._ENTRY_POINT_CALLBACK = null;

// Make API stuff public:
lambdafai.database = require('./api/database');
lambdafai.errors = require('./api/errors');

module.exports = lambdafai;
