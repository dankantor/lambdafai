var Application = require('./api/application');
var commandLineTool = require('./command-line');
var handler = require('./handler');

/**
 * Creates a Lambdafai application. Example usage:
 * ```
var lambdafai = require('lambdafai');

lambdafai('hello-world', function(app) {
  var hello = app.lambda({ name: 'hello' });

  hello.get('/hello', function(req, res) {
    res.send('Hello, world!');
  });
});```
 *
 * @param {string} name - the name of the application; used as a prefix for all resources (required)
 * @param {function} configureAppCallback - The {@link Application} object is passed to this
 *                   callback to be configured
 */
var lambdafai = function(name, configureAppCallback) {
  var app = new Application(name);
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
