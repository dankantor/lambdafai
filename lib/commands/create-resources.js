var _ = require('lodash');
var async = require('async');
var awsSdk = require('aws-sdk');
var callbacks = require('../internal/callbacks');
var JSZip = new require('jszip');
var readline = require('readline');
var strings = require('../internal/strings');
var utils = require('../internal/utils');

var aws;

var MINIMAL_LAMBDA = 'exports.handler=function(e,c){c.done()}';

var TRUST_RELATIONSHIP = {
  Version: '2012-10-17',
  Statement: [{
      Sid: 'AllowAPIGatewayAndLambdaToAssumeRole',
      Effect: 'Allow',
      Principal: {
        Service: [
          'lambda.amazonaws.com',
          'apigateway.amazonaws.com'
        ]
      },
      Action: 'sts:AssumeRole'
  }]
};

var POLICY_TEMPLATE = {
  Version: '2012-10-17',
  Statement: [{
      Sid: 'AllowAccessToDynamoDB',
      Effect: 'Allow',
      Action: [ 'dynamodb:*' ],
      Resource: [ 'arn:aws:dynamodb:*:*:table/$NAME-*' ]
    }, {
      Sid: 'AllowAccessToS3',
      Effect: 'Allow',
      Action: [ 's3:*' ],
      Resource: [ 'arn:aws:s3:::$NAME-*' ]
    }, {
      Sid: 'AllowAccessToSNSForPushNotifications',
      Effect: 'Allow',
      Action: [ 'sns:*' ],
      Resource: [ '*' ],
    }, {
      Sid: 'AllowWriteAccessToCloudWatch',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
      ],
      Effect: 'Allow',
      Resource: [ '*' ],
    }, {
      Sid: 'AllowLambdaFunctionInvocation',
      Effect: 'Allow',
      Action: [ 'lambda:InvokeFunction' ],
      Resource: [ '*' ],
    }
  ]
};

var POLICY_NAME = 'app-policy';

function initAWS(region) {
  aws = {
    iam: new awsSdk.IAM(),
    dynamo: new awsSdk.DynamoDB(),
    lambda: new awsSdk.Lambda(),
    gateway: new awsSdk.APIGateway(),
    s3: new awsSdk.S3(),
  };
}

function getTables(names, done) {
  async.map(names, function(name, next) {
    console.log('Getting table: ' + name);
    aws.dynamo.describeTable({ TableName: name },
      callbacks.ignoreErrors('ResourceNotFoundException', next));
  }, function(err, result) {
    done(err, _.keyBy(result.map(function(x) { return x ? x.Table : null; }), 'TableName'));
  });
}

function getLambdas(names, done) {
  async.map(names, function(name, next) {
    console.log('Getting lambda: ' + name);
    aws.lambda.getFunction({ FunctionName: name },
      callbacks.ignoreErrors('ResourceNotFoundException', next));
  }, function(err, result) {
    done(err, _.keyBy(result.map(function(x) { return x ? x.Configuration : null; }),
      'FunctionName'));
  });
}

function collectInfo(app, done) {
  console.log('Collecting info for app: ' + app.name + ', environment: ' + environment);
  async.auto({
    user: function(callback, context) {
      console.log('Getting user');
      aws.iam.getUser(callback);
    },
    names: ['user', function(callback, context) {
      var names = {};
      names.apiName = app.name;
      names.username = context.user.User.UserName;
      names.baseArn = context.user.User.Arn.split(':').slice(0, 5).join(':');
      names.roleName = app.name + '-role';
      names.roleArn = names.baseArn + ':role/' + names.roleName;
      names.tableNames = app.tables.map(function(table) {
        return app.name + '-' + environment + '-' + table.name;
      });
      if (app.useACL) {
        names.tableNames.push(app.name + '-' + environment + '-acl');
      }
      names.bucketNames = app.buckets.map(function(bucket) {
        return app.name + '-' + environment + '-' + bucket.name;
      });
      names.lambdaNames = app.lambdas.map(function(lambda) {
        return app.name + '-' + lambda.name;
      });
      callback(null, names);
    }],
    iamRole: ['names', function(callback, context) {
      console.log('Getting role: ' + context.names.roleName);
      aws.iam.getRole({RoleName: context.names.roleName},
        callbacks.ignoreErrors('NoSuchEntity', callback));
    }],
    iamPolicy: ['names', function(callback, context) {
      console.log('Getting inline policy for role: ' + context.names.roleName);
      aws.iam.getRolePolicy({RoleName: context.names.roleName, PolicyName: POLICY_NAME},
        callbacks.ignoreErrors('NoSuchEntity', callback));
    }],
    tables: ['names', function(callback, context) {
      getTables(context.names.tableNames, callback);
    }],
    lambdas: ['names', function(callback, context) {
      getLambdas(context.names.lambdaNames, callback);
    }],
    buckets: ['names', function(callback, context) {
      aws.s3.listBuckets(function(err, data) {
        if (!err) {
          callback(null, _.keyBy(data.Buckets.filter(function(bucket) {
            return context.names.bucketNames.indexOf(bucket.Name) >= 0;
          }), 'Name'));
        } else {
          callback(err);
        }
      });
    }],
    api: ['names', function(callback, context) {
      console.log('Getting API: ' + context.names.apiName);
      aws.gateway.getRestApis({limit: 500}, function(err, data) {
        if (!err) {
          var apis = data.items.filter(function(api) { return api.name == context.names.apiName; });
          if (apis.length > 0) {
            context.names.apiID = apis[0].id;
            callback(null, apis[0]);
          } else {
            callback();
          }
        } else {
          callback(err);
        }
      });
    }],
  }, done);
}

function newCreateTableAction(name, table) {
  var params;
  if (table.fullSchema) {
    params = fullSchema;  // Caller specified full parameters
  } else {
    var attributes = {};
    var keySchema = [];
    for (var i = 0; i < Math.min(table.key.length, 2); i++) {
      var parts = table.key[i].split(':');
      var keyName = parts[0];
      var type = 'S';
      if (parts.length > 1 && parts[1] == 'number') {
        type = 'N';
      } else if (parts.length > 1 && parts[1] == 'binary') {
        type = 'B';
      }
      attributes[keyName] = { AttributeName: keyName, AttributeType: type };
      keySchema.push({ AttributeName: keyName, KeyType: ((i === 0) ? 'HASH' : 'RANGE') });
    }
    params = {
      AttributeDefinitions: _.values(attributes),
      KeySchema: keySchema,
    };
  }
  params.TableName = name;
  params.ProvisionedThroughput = { ReadCapacityUnits: 1, WriteCapacityUnits: 1 };
  return {
    description: 'Create DynamoDB Table: ' + name,
    service: 'dynamo',
    operation: 'createTable',
    params: params,
  };
}

function newCreateACLAction(name) {
  var params = {
    TableName: name,
    AttributeDefinitions: [
      {AttributeName: 'userID', AttributeType: 'S'},
      {AttributeName: 'res', AttributeType: 'S'}
    ],
    KeySchema: [
      {AttributeName: 'userID', KeyType: 'HASH'},
      {AttributeName: 'res', KeyType: 'RANGE'}
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    GlobalSecondaryIndexes: [{
      IndexName: 'by-resource',
      KeySchema: [
        {AttributeName: 'res', KeyType: 'HASH'},
        {AttributeName: 'userID', KeyType: 'RANGE'},
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    }],
  };
  return {
    description: 'Create DynamoDB ACL Table: ' + name,
    service: 'dynamo',
    operation: 'createTable',
    params: params,
  };
}

function newCreateLambdaAction(name, role, lambda) {
  var zip = new JSZip();
  zip.file('lambdafai.js', MINIMAL_LAMBDA);
  var codeData = zip.generate({type: 'nodebuffer'});
  return {
    description: 'Create Lambda Function: ' + name,
    service: 'lambda',
    operation: 'createFunction',
    params: {
      FunctionName: name,
      Runtime: 'nodejs',
      Role: role,
      Handler: 'lambdafai-entry-point.handler',
      Description: lambda.desription,
      Code: { ZipFile: codeData },
      Timeout: lambda.timeout,
      MemorySize: lambda.ram
    }
  };
}

function newCreateBucketAction(name, bucket) {
  return {
    description: 'Create S3 Bucket: ' + name,
    service: 's3',
    operation: 'createBucket',
    params: {
      Bucket: name,
      ACL: bucket.acl,
    }
  };
}


function generateActions(app, info) {
  var actions = [];
  if (!info.iamRole) {
    actions.push({
      description: 'Create IAM Role: ' + info.names.roleName,
      service: 'iam',
      operation: 'createRole',
      params: {
        RoleName: info.names.roleName,
        AssumeRolePolicyDocument: JSON.stringify(TRUST_RELATIONSHIP),
      }
    });
  }

  if (!info.iamPolicy) {
    var policy = strings.replaceAll(JSON.stringify(POLICY_TEMPLATE), '$NAME', info.names.apiName);
    actions.push({
      description: 'Create Inline IAM Policy: ' + POLICY_NAME,
      service: 'iam',
      operation: 'putRolePolicy',
      params: {
        RoleName: info.names.roleName,
        PolicyName: POLICY_NAME,
        PolicyDocument: policy
      },
      wait: 5,
    });
  }

  _.forEach(app.tables, function(table) {
    var name = app.name + '-' + environment + '-' + table.name;
    if (!info.tables[name]) {
      actions.push(newCreateTableAction(name, table));
    }
  });

  if (app.useACL) {
    var name = app.name + '-' + environment + '-acl';
    if (!info.tables[name]) {
      actions.push(newCreateACLAction(name));
    }
  }

  _.forEach(app.buckets, function(bucket) {
    var name = app.name + '-' + environment + '-' + bucket.name;
    if (!info.buckets[name]) {
      actions.push(newCreateBucketAction(name, bucket));
    }
  });

  _.forEach(app.lambdas, function(lambda) {
    var name = app.name + '-' + lambda.name;
    if (!info.lambdas[name]) {
      actions.push(newCreateLambdaAction(name, info.names.roleArn, lambda));
    }
  });

  if (!info.api) {
    actions.push({
      description: 'Create API Gateway REST API: ' + info.names.apiName,
      service: 'gateway',
      operation: 'createRestApi',
      params: {
        name: info.names.apiName,
        description: 'Generated by Lambdafai',
      },
    });
  }

  return actions;
}

function applyActions(actions, done) {
  utils.logBanner();
  async.eachSeries(actions, function(action, next) {
    console.log('Performing: ' + action.description);
    var service = aws[action.service];
    var method = service[action.operation].bind(service);
    method(action.params, callbacks.waitAfterSuccess(action.wait, next));
  }, done);
}

module.exports = {
  description: 'Creates or updates the configured AWS resources.',

  configureParser: function(parser) {
    parser.addArgument([ 'environment' ], {
      help: 'Name of the environment to create resources in, e.g. "dev".'
    });
  },

  execute: function(app, args, callback) {
    environment = args.environment;
    strings.checkIdentifier(environment);
    initAWS(args.region);

    async.waterfall([
      function collect(next) {
        collectInfo(app, next);
      },
      function actions(info, next) {
        if (args.verbose) {
          utils.banner('Collected info:\n' + JSON.stringify(info, null, 2));
        }
        next(null, info, generateActions(app, info));
      },
      function prompt(info, actions, next) {
        utils.logBanner('Application:   ' + app.name + '\n' +
                        'Environment:   ' + environment + '\n' +
                        'AWS Region:    ' + args.region + '\n' +
                        'AWS User:      ' + info.user.User.Arn);
        if (actions.length === 0) {
          console.log('\nAll resources already exist!\n');
          process.exit(0);
        }
        console.log('The following actions will be performed:\n');
        var num = 1;
        _.forEach(actions, function(action) {
          console.log(_.pad(num++ + '.', 4) + action.description);
          if (args.verbose) {
            var cmd = '      ' + action.service + '.' + action.operation + '(' +
                JSON.stringify(action.params, null, 2) + ')\n';
            console.log(strings.replaceAll(cmd, '\n', '\n      '));
          }
        });

        var rl = readline.createInterface({input: process.stdin, output: process.stdout});
        rl.question('\nType "yes" to continue: ', function(answer) {
          if (answer.toLowerCase() != 'yes') {
            next(new Error('User cancelled operation'));
          } else {
            next(null, info, actions);
          }
          rl.close();
        });
      },
      function apply(info, actions, next) {
        applyActions(actions, next);
      },
    ], function(err) {
      if (!err) {
        utils.logBanner('Success!');
      }
      callback(err);
    });
  },
};
