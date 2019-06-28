const localServer = require('../internal/local-server');

module.exports = {
  description: 'Runs a local server to handle requests.',

  configureParser: function(parser) {
    parser.addArgument([ 'environment' ], {
      help: 'Name of the environment to simulate running in, e.g. "dev".'
    });
    parser.addArgument([ '-p', '--port' ], {
      help: 'The port to run the server on. Default is 8000.',
      defaultValue: 8000
    });
    parser.addArgument([ '-path', '--path' ], {
      help: 'Optional path to prepend to all requests (ie html/).',
      defaultValue: null
    });
  },

  execute: function(app, args, callback) {
    localServer.listen(app, args, callback);
  }
};