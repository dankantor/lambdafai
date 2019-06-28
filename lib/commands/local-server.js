const localServer = require('../internal/local-server');

module.exports = {
  description: 'Runs a local server to handle requests.',

  configureParser: function(parser) {
    parser.addArgument([ 'environment' ], {
      help: 'Name of the environment to simulate running in, e.g. "dev".'
    });
    parser.addArgument([ '--port' ], {
      help: 'The port to run the server on. Default is 8000.',
      defaultValue: 8000
    });
    parser.addArgument([ '--path' ], {
      help: 'Optional path to prepend to all requests, e.g. "html".',
      defaultValue: null
    });
    parser.addArgument([ '--pathoverride' ], {
      help: 'If set, will override any path prepend. Comma separated e.g. "api,auth".',
      defaultValue: null
    });
  },

  execute: function(app, args, callback) {
    localServer.listen(app, args, callback);
  }
};