var async = require('async');
var ApiDeployer = require('../internal/api-deployer');
var LambdaDeployer = require('../internal/lambda-deployer');
var strings = require('../internal/strings');
var utils = require('../internal/utils');

module.exports = {
  description: 'Promotes Lambda code and API Gateway config from one environment to another.',

  configureParser: function(parser) {
    parser.addArgument([ 'source_environment' ], {
      help: 'Name of the environment to promote from, e.g. "dev".'
    });
    parser.addArgument([ 'target_environment' ], {
      help: 'Name of the environment to promote to, e.g. "staging".'
    });
  },

  execute: function(app, args, callback) {
    strings.checkIdentifier(args.target_environment);
    utils.logBanner('Promoting from "' + args.source_environment + '" to "' +
        args.target_environment + '".');
    var lambdaDeployer = new LambdaDeployer(app);
    var apiDeployer = new ApiDeployer(app);
    async.waterfall([
      function promoteLambda(next) {
        utils.logBanner('Promoting Lambda');
        lambdaDeployer.promote(args.source_environment, args.target_environment, next);
      },
      function promoteApiGateway(next) {
        utils.logBanner('Promoting API Gateway');
        apiDeployer.promote(args.source_environment, args.target_environment, next);
      },
      function successMessage(next) {
        utils.logBanner('Success!');
        next();
      }
    ], callback);
  },
};
