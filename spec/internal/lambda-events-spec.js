var events = require('../../lib/internal/lambda-events');

// Events: these are taken from the Lambda test event generator:

var S3_PUT = {
  "Records": [
    {
      "eventVersion": "2.0",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "s3": {
        "configurationId": "testConfigRule",
        "object": {
          "eTag": "0123456789abcdef0123456789abcdef",
          "sequencer": "0A1B2C3D4E5F678901",
          "key": "HappyFace.jpg",
          "size": 1024
        },
        "bucket": {
          "arn": "arn:aws:s3:::sourcebucket",
          "name": "sourcebucket",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          }
        },
        "s3SchemaVersion": "1.0"
      },
      "responseElements": {
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
        "x-amz-request-id": "EXAMPLE123456789"
      },
      "awsRegion": "us-east-1",
      "eventName": "ObjectCreated:Put",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "eventSource": "aws:s3"
    }
  ]
};

var S3_DELETE = {
  "Records": [
    {
      "eventVersion": "2.0",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "s3": {
        "configurationId": "testConfigRule",
        "object": {
          "sequencer": "0A1B2C3D4E5F678901",
          "key": "HappyFace.jpg"
        },
        "bucket": {
          "arn": "arn:aws:s3:::sourcebucket",
          "name": "sourcebucket",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          }
        },
        "s3SchemaVersion": "1.0"
      },
      "responseElements": {
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
        "x-amz-request-id": "EXAMPLE123456789"
      },
      "awsRegion": "us-east-1",
      "eventName": "ObjectRemoved:Delete",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "eventSource": "aws:s3"
    }
  ]
};

var DYNAMODB_UPDATE = {
  "Records": [
    {
      "eventID": "1",
      "eventVersion": "1.0",
      "dynamodb": {
        "Keys": {
          "Id": {
            "N": "101"
          }
        },
        "NewImage": {
          "Message": {
            "S": "New item!"
          },
          "Id": {
            "N": "101"
          }
        },
        "StreamViewType": "NEW_AND_OLD_IMAGES",
        "SequenceNumber": "111",
        "SizeBytes": 26
      },
      "awsRegion": "us-west-2",
      "eventName": "INSERT",
      "eventSourceARN": "arn:aws:dynamodb:us-west-2:account-id:table/T/stream/2015-06-27T00:48:05",
      "eventSource": "aws:dynamodb"
    },
  ]
};

var API_GATEWAY_EVENT = {
  stage: 'prod',
  method: 'GET',
  path: '/a/b/c',
  headerNames: [],
  headers: {},
  paramNames: [],
  params: {},
  queryNames: [],
  query: {}
};

var CONTEXT = {
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:12345678:function:hello-world-hello:dev'
}

describe('LambdaEvents#standardizeEvent', function() {
  it('passes through API gateway event', function() {
    expect(events.standardizeEvent(API_GATEWAY_EVENT, CONTEXT)).toEqual(API_GATEWAY_EVENT);
  });

  it('converts S3 put event', function() {
    expect(events.standardizeEvent(S3_PUT, CONTEXT)).toEqual({
      method: 'S3PUT',
      stage: 'dev',
      path: '/HappyFace.jpg',
      headers: {
        'Content-Length': 1024,
        'X-Bucket-Name': 'sourcebucket'
      }
    });
  });

  it('rejects s3 delete event', function() {
    expect(events.standardizeEvent(S3_DELETE, CONTEXT)).toBeUndefined();
  });

  it('rejects DynamoDB event', function() {
    expect(events.standardizeEvent(DYNAMODB_UPDATE, CONTEXT)).toBeUndefined();
  });
});
