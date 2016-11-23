var _ = require('lodash');
var paths = require('./paths');
var strings = require('./strings');

function stageFromLambdaArn(arn) {
  if (arn && arn.indexOf('arn:aws:lambda:') === 0) {
    var parts = arn.split(':');
    if (parts.length >= 8) {
      return parts[7];
    }
  }
  console.error('Unable to parse stage from ARN: ' + arn);
}

function isStandardEvent(event) {
  return event.requestContext && event.requestContext.stage && event.httpMethod && event.path;
}

function findRoute(app, method, path) {
  return _.find(_.flatten(_.map(app.lambdas, 'handlers')), function(h) {
    return h.type == 'route' && h.method == method && paths.match(h.path, path);
  });
}

function isS3PutEvent(event) {
  return !!event.Records &&
    event.Records.length == 1 &&
    event.Records[0].eventSource == 'aws:s3' &&
    event.Records[0].eventName &&
    event.Records[0].eventName.indexOf('ObjectCreated:') === 0 &&
    !!event.Records[0].s3 &&
    !!event.Records[0].s3.bucket &&
    !!event.Records[0].s3.object;
}

function convertS3PutEvent(app, event, context) {
  var record = event.Records[0];
  var bucket = record.s3.bucket;
  var object = record.s3.object;
  var path = '/' + object.key;

  // Because we didn't come through API gateway, path params are not parsed, so we need to do
  // that now. This requires finding the route that will handle this request.
  var params = {};
  var route = findRoute(app, 'S3PUT', path);
  if (route) {
    params = paths.match(route.path, path);
  }

  return {
    method: 'S3PUT',
    stage: stageFromLambdaArn(context.invokedFunctionArn),
    path: '/' + object.key,
    params: strings.toAmazonDictionaryPairs(params),
    paramNames: strings.toAmazonDictionaryNames(params),
    body: {
      Size: object.size,
      Bucket: bucket.name
    }
  };
}

function isScheduledEvent(event) {
  return !!event['detail-type'] &&
    event['detail-type'] == 'Scheduled Event' &&
    !!event.source &&
    event.source == 'aws.events' &&
    !!event.resources &&
    event.resources.length == 1;
}

function convertScheduledEvent(app, event, context) {
  var resources = event.resources[0];
  var splits = resources.split(':');
  var rule = splits[splits.length - 1];
  var ruleSplits = rule.split('/');
  var path = ruleSplits[1];

  return {
    method: 'SCHEDULEDEVENT',
    stage: stageFromLambdaArn(context.invokedFunctionArn),
    path: '/' + path
  };
}

function isAPIGatewayAuthorizerEvent(event) {
  return !!event.type &&
    event.type == 'TOKEN' &&
    !!event.authorizationToken &&
    !!event.methodArn;
}

function convertAPIGatewayAuthorizerEvent(app, event, context) {
  var methodArn = event.methodArn;
  var splits = methodArn.split(':');
  var rule = splits[splits.length - 1];
  var ruleSplits = rule.split('/');
  var stage = ruleSplits[1];
  var path = ruleSplits[2];
  for (var i = 3; i < ruleSplits.length; i++) {
    path += '/' + ruleSplits[i];
  }
  
  return {
    method: 'APIGATEWAYAUTHORIZEREVENT',
    stage: stage,
    path: '/' + path,
    headers: "{Authorization=" + event.authorizationToken + "}",
    headerNames: "[Authorization]"
  };
}

module.exports = {
  /**
   * Takes an input Lambda event and converts it to our standard event format. If the event cannot
   * be converted, this returns undefined.
   */
  standardizeEvent: function(app, event, context) {
    if (isStandardEvent(event)) {
      return event;
    } else if (isS3PutEvent(event)) {
      return convertS3PutEvent(app, event, context);
    } else if (isScheduledEvent(event)) {
      return convertScheduledEvent(app, event, context);
    } else if (isAPIGatewayAuthorizerEvent(event)) {
      return convertAPIGatewayAuthorizerEvent(app, event, context);
    }
  }
};
