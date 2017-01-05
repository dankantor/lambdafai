var async = require('async');
var ApiDeployer = require('../internal/api-deployer');
var LambdaDeployer = require('../internal/lambda-deployer');
var strings = require('../internal/strings');
var utils = require('../internal/utils');

module.exports = {
  description: 'Deploys Lambda code and API Gateway config to a given environment.',

  configureParser: function(parser) {
    parser.addArgument([ 'environment' ], {
      help: 'Name of the environment to deploy to, e.g. "dev".'
    });
    parser.addArgument([ '--lambda' ], {
      help: 'Deploy a single Lambda function instead of everything, skip API gateway deployment',
    });
    parser.addArgument([ '--override' ], {
      help: 'Set as true to override the default behavior which does not allow deploying directly to prod or staging',
    });
    parser.addArgument([ '--iamuser' ], {
      help: 'Set the IAM user to deploy with. Note: the authenitcated user will need all the IAM permssions to deploy',
    });
  },

  execute: function(app, args, callback) {
    strings.checkIdentifier(args.environment);
    if (args.override !== 'true') {
      if (args.environment.indexOf('prod') >= 0 || args.environment.indexOf('staging') >= 0) {
        callback(new Error('Refusing to deploy directly to "' + args.environment + '". ' +
                           'Use the "promote" command instead.'));
        return;
      }
    }
    utils.logBanner('Deploying to environment: ' + args.environment);

    var lambdaDeployer = new LambdaDeployer(app);
    var apiDeployer = new ApiDeployer(app, args.iamuser);
    async.waterfall([
      function deployLambda(next) {
        utils.logBanner('Deploying Lambda');
        lambdaDeployer.deploy(args.environment, args.lambda, next);
      },
      function deployApiGateway(next) {
        if (args.lambda) {
          next();
        } else {
          utils.logBanner('Deploying API Gateway');
          apiDeployer.deploy(args.environment, next);
        }
      },
      function successMessage(next) {
        utils.logBanner('Success!');
        next();
      }
    ], callback);
  },
};
