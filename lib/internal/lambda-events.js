var _ = require('lodash');
var paths = require('./paths');

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
  return event.stage && event.method && event.path;
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
    params: params,
    body: {
      Size: object.size,
      Bucket: bucket.name
    }
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
    }
  },
};
