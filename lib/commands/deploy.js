var async = require('async');
var ApiDeployer = require('../internal/api-deployer');
var LambdaDeployer = require('../internal/lambda-deployer');
var utils = require('../internal/utils');

module.exports = {
  description: 'Deploys Lambda code and API Gateway config to a given environment.',

  configureParser: function(parser) {
    parser.addArgument([ '--skip-api-gateway' ], {
      help: 'Skip API Gateway deploy. Use this for faster deploys when there are not changes.',
      action: 'storeTrue',
      defaultValue: false,
    });
  },

  execute: function(app, args, callback) {
    if (args.environment.indexOf('prod') >= 0 || args.environment.indexOf('staging') >= 0) {
      callback(new Error('Refusing to deploy directly to "' + args.environment + '". ' +
                         'Use the "promote" command instead.'));
      return;
    }

    var lambdaDeployer = new LambdaDeployer(app);
    var apiDeployer = new ApiDeployer(app);
    async.waterfall([
      function deployLambda(next) {
        utils.logSeparator();
        console.log('Deploying Lambda');
        lambdaDeployer.deploy(args.environment, next);
      },
      function deployApiGateway(next) {
        if (args.skip_api_gateway) {
          next();
        } else {
          utils.logSeparator();
          console.log('Deploying API Gateway');
          apiDeployer.deploy(args.environment, next);
        }
      },
      function successMessage(next) {
        utils.logSeparator();
        console.log('Success!');
        next();
      }
    ], callback);
  },
};
