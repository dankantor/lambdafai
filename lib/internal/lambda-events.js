var utils = require('./utils');

function stageFromLambdaArn(arn) {
  if (arn && arn.indexOf('arn:aws:lambda:') == 0) {
    var parts = arn.split(':');
    if (parts.length > 5) {
      return parts[parts.length - 1];
    }
  }
  console.error('Unable to parse stage from ARN: ' + arn);
}

function isStandardEvent(event) {
  return event.stage && event.method && event.path;
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

function convertS3PutEvent(event, context) {
  var record = event.Records[0];
  var bucket = record.s3.bucket;
  var object = record.s3.object;
  return {
    method: 'S3PUT',
    stage: stageFromLambdaArn(context.invokedFunctionArn),
    path: '/' + object.key,
    headers: {
      'Content-Length': object.size,
      'X-Bucket-Name': bucket.name
    }
  };
}

module.exports = {
  /**
   * Takes an input Lambda event and converts it to our standard event format. If the event cannot
   * be converted, this returns undefined.
   */
  standardizeEvent: function(event, context) {
    if (isStandardEvent(event)) {
      return event;
    } else if (isS3PutEvent(event)) {
      return convertS3PutEvent(event, context);
    }
  },
};
