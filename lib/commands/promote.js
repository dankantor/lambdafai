var async = require('async');
var ApiDeployer = require('../internal/api-deployer');
var LambdaDeployer = require('../internal/lambda-deployer');
var utils = require('../internal/utils');

module.exports = {
  description: 'Promotes Lambda code and API Gateway config from one environment to another.',

  configureParser: function(parser) {
    parser.addArgument([ '-s', '--source-environment' ], {
      help: 'The environment to promote from.',
      required: true,
    });
  },

  execute: function(app, args, callback) {
    console.log('Promoting from "' + args.source_environment + '" to "' + args.environment + '".');
    var lambdaDeployer = new LambdaDeployer(app);
    var apiDeployer = new ApiDeployer(app);
    async.waterfall([
      function promoteLambda(next) {
        utils.logSeparator('Promoting Lambda');
        lambdaDeployer.promote(args.source_environment, args.environment, next);
      },
      function promoteApiGateway(next) {
        utils.logSeparator('Promoting API Gateway');
        apiDeployer.promote(args.source_environment, args.environment, next);
      },
      function successMessage(next) {
        utils.logSeparator('Success!');
        next();
      }
    ], callback);
  },
};
