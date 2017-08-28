var Application = require('../../lib/api/application');
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
          "key": "uploads/HappyFace.jpg",
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
          "key": "uploads/HappyFace.jpg"
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

var DYNAMODB_INSERT = {
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
  "body": "{\"test\":\"body\"}",
  "resource": "/{proxy+}",
  "requestContext": {
    "resourceId": "123456",
    "apiId": "1234567890",
    "resourcePath": "/{proxy+}",
    "httpMethod": "POST",
    "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
    "accountId": "123456789012",
    "identity": {
      "apiKey": null,
      "userArn": null,
      "cognitoAuthenticationType": null,
      "caller": null,
      "userAgent": "Custom User Agent String",
      "user": null,
      "cognitoIdentityPoolId": null,
      "cognitoIdentityId": null,
      "cognitoAuthenticationProvider": null,
      "sourceIp": "127.0.0.1",
      "accountId": null
    },
    "stage": "prod"
  },
  "queryStringParameters": {
    "foo": "bar"
  },
  "headers": {
    "Via": "1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)",
    "Accept-Language": "en-US,en;q=0.8",
    "CloudFront-Is-Desktop-Viewer": "true",
    "CloudFront-Is-SmartTV-Viewer": "false",
    "CloudFront-Is-Mobile-Viewer": "false",
    "X-Forwarded-For": "127.0.0.1, 127.0.0.2",
    "CloudFront-Viewer-Country": "US",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
    "X-Forwarded-Port": "443",
    "Host": "1234567890.execute-api.us-east-1.amazonaws.com",
    "X-Forwarded-Proto": "https",
    "X-Amz-Cf-Id": "cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==",
    "CloudFront-Is-Tablet-Viewer": "false",
    "Cache-Control": "max-age=0",
    "User-Agent": "Custom User Agent String",
    "CloudFront-Forwarded-Proto": "https",
    "Accept-Encoding": "gzip, deflate, sdch"
  },
  "pathParameters": {
    "proxy": "path/to/resource"
  },
  "httpMethod": "POST",
  "stageVariables": {
    "baz": "qux"
  },
  "path": "/path/to/resource"
};

var SCHEDULED_EVENT = {
  "account": "123456789012",
  "region": "us-east-1",
  "detail": {},
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "time": "1970-01-01T00:00:00Z",
  "id": "cdc73f9d-aea9-11e3-9d5a-835b769c0d9c",
  "resources": [
    "arn:aws:events:us-east-1:123456789012:rule/my-schedule"
  ]
};

var API_GATEWAY_AUTHORIZER_EVENT = {
  "authorizationToken": "Bearer foo",
  "methodArn": "arn:aws:execute-api:us-east-1:123456789012/dev/GET/auth",
  "type": "TOKEN"
};

var COGNITO_EVENT = {
  "version": 1,
  "triggerSource": "PreSignUp_SignUp",
  "region": "us-east-1",
  "userPoolId": "abc",
  "callerContext": {
    "awsSdkVersion": "version",
    "clientId": "client"
  },
  "request": {
    "userAttributes": {
      "name": "bob",
    }
  },
  "response": {}
};

var CONTEXT = {
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:12345678:function:hello-world-hello:dev'
};

var CLOUDWATCH_LOGS_EVENT = {
  "awslogs": {
    "data": "H4sIAAAAAAAAAHWPwQqCQBCGX0Xm7EFtK+smZBEUgXoLCdMhFtKV3akI8d0bLYmibvPPN3wz00CJxmQnTO41whwWQRIctmEcB6sQbFC3CjW3XW8kxpOpP+OC22d1Wml1qZkQGtoMsScxaczKN3plG8zlaHIta5KqWsozoTYw3/djzwhpLwivWFGHGpAFe7DL68JlBUk+l7KSN7tCOEJ4M3/qOI49vMHj+zCKdlFqLaU2ZHV2a4Ct/an0/ivdX8oYc1UVX860fQDQiMdxRQEAAA=="
  }
};

var KINESIS_FIREHOSE_EVENT = { 
  "invocationId": "944d1a50-220c-4e3d-bfd4-531bb64db0f2",
  "deliveryStreamArn": "arn:aws:firehose:us-east-1:12345678:deliverystream/dev-test",
  "region": "us-east-1",
  "records":  [ { "recordId": "49575922258983432485582510636939777006579745560287248386000000", "approximateArrivalTimestamp": 1502378544895, "data": "eyJldmVudFR5cGUiOiJTZW5kIiwibWFpbCI6eyJ0aW1lc3RhbXAiOiIyMDE3LTA4LTEwVDE1OjIyOjEyLjM0NFoiLCJzb3VyY2UiOiJEYW4gS2FudG9yIDxub3RpZmljYXRpb25zQHBpbG90c2hpcC5jb20+Iiwic291cmNlQXJuIjoiYXJuOmF3czpzZXM6dXMtZWFzdC0xOjM5NDk3NzAzMTUyMjppZGVudGl0eS9ub3RpZmljYXRpb25zQHBpbG90c2hpcC5jb20iLCJzZW5kaW5nQWNjb3VudElkIjoiMzk0OTc3MDMxNTIyIiwibWVzc2FnZUlkIjoiMDEwMDAxNWRjY2JkMWRmOC0xZTcxMzZhOC0zN2U0LTQ4M2MtYWY0Mi0xYzc5MTZmY2MwZDUtMDAwMDAwIiwiZGVzdGluYXRpb24iOlsiZGFuQHBpbG90c2hpcC5jb20iXSwiaGVhZGVyc1RydW5jYXRlZCI6ZmFsc2UsImhlYWRlcnMiOlt7Im5hbWUiOiJGcm9tIiwidmFsdWUiOiJEYW4gS2FudG9yIDxub3RpZmljYXRpb25zQHBpbG90c2hpcC5jb20+In0seyJuYW1lIjoiUmVwbHktVG8iLCJ2YWx1ZSI6IkRhbiBLYW50b3IgPGRhbkBwaWxvdHNoaXAuY29tPiJ9LHsibmFtZSI6IlRvIiwidmFsdWUiOiJkYW5AcGlsb3RzaGlwLmNvbSJ9LHsibmFtZSI6IlN1YmplY3QiLCJ2YWx1ZSI6IlRlc3RpbmcgMTEgTmV3c2xldHRlciAjMSJ9LHsibmFtZSI6Ik1JTUUtVmVyc2lvbiIsInZhbHVlIjoiMS4wIn0seyJuYW1lIjoiQ29udGVudC1UeXBlIiwidmFsdWUiOiJtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7ICBib3VuZGFyeT1cIi0tLS09X1BhcnRfNjYxMTUxXzU3ODEyODA5MC4xNTAyMzc4NTMyMzQ3XCIifV0sImNvbW1vbkhlYWRlcnMiOnsiZnJvbSI6WyJEYW4gS2FudG9yIDxub3RpZmljYXRpb25zQHBpbG90c2hpcC5jb20+Il0sInJlcGx5VG8iOlsiRGFuIEthbnRvciA8ZGFuQHBpbG90c2hpcC5jb20+Il0sInRvIjpbImRhbkBwaWxvdHNoaXAuY29tIl0sIm1lc3NhZ2VJZCI6IjAxMDAwMTVkY2NiZDFkZjgtMWU3MTM2YTgtMzdlNC00ODNjLWFmNDItMWM3OTE2ZmNjMGQ1LTAwMDAwMCIsInN1YmplY3QiOiJUZXN0aW5nIDExIE5ld3NsZXR0ZXIgIzEifSwidGFncyI6eyJzZXM6Y29uZmlndXJhdGlvbi1zZXQiOlsiZGV2Il0sInRyYWNrZXJJZCI6WyJ4Z3N4OXBtYXU3NjVxOHY5Z3k3dWZ5c28wdjRyb2xyMGI3amtkMWp3Il0sInNlczpzb3VyY2UtaXAiOlsiNTQuMjEwLjIzNi4xNzQiXSwic2VzOmZyb20tZG9tYWluIjpbInBpbG90c2hpcC5jb20iXSwidGVhbUlkIjpbImw2dHN4djBtZGFwcWJsY29tM3hzdnNsYSJdLCJzZXM6Y2FsbGVyLWlkZW50aXR5IjpbInBpbG90c2hpcC1yb2xlIl0sImVudiI6WyJkZXYiXSwibmV3c2xldHRlcklkIjpbIjJ4YWVnMnVpenpsb2kycjQ0Z3AyYmR1dWN5N294aDZkeGJtemU5ZGsiXX19LCJzZW5kIjp7fX0K" }, { "recordId": "49575922258983432485582510636940985932399364106472128514000000", "approximateArrivalTimestamp": 1502378601268, "data": "eyJldmVudFR5cGUiOiJEZWxpdmVyeSIsIm1haWwiOnsidGltZXN0YW1wIjoiMjAxNy0wOC0xMFQxNToyMjoxMi4zNDRaIiwic291cmNlIjoiRGFuIEthbnRvciA8bm90aWZpY2F0aW9uc0BwaWxvdHNoaXAuY29tPiIsInNvdXJjZUFybiI6ImFybjphd3M6c2VzOnVzLWVhc3QtMTozOTQ5NzcwMzE1MjI6aWRlbnRpdHkvbm90aWZpY2F0aW9uc0BwaWxvdHNoaXAuY29tIiwic2VuZGluZ0FjY291bnRJZCI6IjM5NDk3NzAzMTUyMiIsIm1lc3NhZ2VJZCI6IjAxMDAwMTVkY2NiZDFkZjgtMWU3MTM2YTgtMzdlNC00ODNjLWFmNDItMWM3OTE2ZmNjMGQ1LTAwMDAwMCIsImRlc3RpbmF0aW9uIjpbImRhbkBwaWxvdHNoaXAuY29tIl0sImhlYWRlcnNUcnVuY2F0ZWQiOmZhbHNlLCJoZWFkZXJzIjpbeyJuYW1lIjoiRnJvbSIsInZhbHVlIjoiRGFuIEthbnRvciA8bm90aWZpY2F0aW9uc0BwaWxvdHNoaXAuY29tPiJ9LHsibmFtZSI6IlJlcGx5LVRvIiwidmFsdWUiOiJEYW4gS2FudG9yIDxkYW5AcGlsb3RzaGlwLmNvbT4ifSx7Im5hbWUiOiJUbyIsInZhbHVlIjoiZGFuQHBpbG90c2hpcC5jb20ifSx7Im5hbWUiOiJTdWJqZWN0IiwidmFsdWUiOiJUZXN0aW5nIDExIE5ld3NsZXR0ZXIgIzEifSx7Im5hbWUiOiJNSU1FLVZlcnNpb24iLCJ2YWx1ZSI6IjEuMCJ9LHsibmFtZSI6IkNvbnRlbnQtVHlwZSIsInZhbHVlIjoibXVsdGlwYXJ0L2FsdGVybmF0aXZlOyAgYm91bmRhcnk9XCItLS0tPV9QYXJ0XzY2MTE1MV81NzgxMjgwOTAuMTUwMjM3ODUzMjM0N1wiIn1dLCJjb21tb25IZWFkZXJzIjp7ImZyb20iOlsiRGFuIEthbnRvciA8bm90aWZpY2F0aW9uc0BwaWxvdHNoaXAuY29tPiJdLCJyZXBseVRvIjpbIkRhbiBLYW50b3IgPGRhbkBwaWxvdHNoaXAuY29tPiJdLCJ0byI6WyJkYW5AcGlsb3RzaGlwLmNvbSJdLCJtZXNzYWdlSWQiOiIwMTAwMDE1ZGNjYmQxZGY4LTFlNzEzNmE4LTM3ZTQtNDgzYy1hZjQyLTFjNzkxNmZjYzBkNS0wMDAwMDAiLCJzdWJqZWN0IjoiVGVzdGluZyAxMSBOZXdzbGV0dGVyICMxIn0sInRhZ3MiOnsic2VzOmNvbmZpZ3VyYXRpb24tc2V0IjpbImRldiJdLCJ0cmFja2VySWQiOlsieGdzeDlwbWF1NzY1cTh2OWd5N3VmeXNvMHY0cm9scjBiN2prZDFqdyJdLCJzZXM6c291cmNlLWlwIjpbIjU0LjIxMC4yMzYuMTc0Il0sInNlczpmcm9tLWRvbWFpbiI6WyJwaWxvdHNoaXAuY29tIl0sInRlYW1JZCI6WyJsNnRzeHYwbWRhcHFibGNvbTN4c3ZzbGEiXSwic2VzOmNhbGxlci1pZGVudGl0eSI6WyJwaWxvdHNoaXAtcm9sZSJdLCJlbnYiOlsiZGV2Il0sIm5ld3NsZXR0ZXJJZCI6WyIyeGFlZzJ1aXp6bG9pMnI0NGdwMmJkdXVjeTdveGg2ZHhibXplOWRrIl0sInNlczpvdXRnb2luZy1pcCI6WyI1NC4yNDAuOC4xOTUiXX19LCJkZWxpdmVyeSI6eyJ0aW1lc3RhbXAiOiIyMDE3LTA4LTEwVDE1OjIyOjEzLjM4NFoiLCJwcm9jZXNzaW5nVGltZU1pbGxpcyI6MTA0MCwicmVjaXBpZW50cyI6WyJkYW5AcGlsb3RzaGlwLmNvbSJdLCJzbXRwUmVzcG9uc2UiOiIyNTAgMi4wLjAgT0sgMTUwMjM3ODUzMyBrNjZzaTU4MjQyMDFxa2guMzIyIC0gZ3NtdHAiLCJyZXBvcnRpbmdNVEEiOiJhOC0xOTUuc210cC1vdXQuYW1hem9uc2VzLmNvbSJ9fQo="}
  ]
};


describe('LambdaEvents#standardizeEvent', function() {
  var app;

  beforeEach(function() {
    app = new Application('test');
    app.lambda({ name: 'foo' })
       .s3put('/uploads/:name', null)
       .scheduledEvent('/my-schedule', null)
       .apiGatewayAuthorizerEvent('/auth', null)
  });

  it('converts API gateway event', function() {
    expect(events.standardizeEvent(app, API_GATEWAY_EVENT, CONTEXT)).toEqual({
      method: 'POST',
      stage: 'prod',
      path: '/{proxy+}',
      headers: { 
        'Via': '1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)',
        'Accept-Language': 'en-US,en;q=0.8',
        'CloudFront-Is-Desktop-Viewer': 'true',
        'CloudFront-Is-SmartTV-Viewer': 'false',
        'CloudFront-Is-Mobile-Viewer': 'false',
        'X-Forwarded-For': '127.0.0.1, 127.0.0.2',
        'CloudFront-Viewer-Country': 'US',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'X-Forwarded-Port': '443',
        'Host': '1234567890.execute-api.us-east-1.amazonaws.com',
        'X-Forwarded-Proto': 'https',
        'X-Amz-Cf-Id': 'cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==',
        'CloudFront-Is-Tablet-Viewer': 'false',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Custom User Agent String',
        'CloudFront-Forwarded-Proto': 'https',
        'Accept-Encoding': 'gzip, deflate, sdch' 
      },
      params: { 
        proxy: 'path/to/resource' 
      },
      query: { 
        foo: 'bar' 
      },
      body: '{"test":"body"}',
      stageVariables: { 
        baz: 'qux' 
      },
      requestContext: { 
        resourceId: '123456',
        apiId: '1234567890',
        resourcePath: '/{proxy+}',
        httpMethod: 'POST',
        requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
        accountId: '123456789012',
        identity: { 
          apiKey: null,
          userArn: null,
          cognitoAuthenticationType: null,
          caller: null,
          userAgent: 'Custom User Agent String',
          user: null,
          cognitoIdentityPoolId: null,
          cognitoIdentityId: null,
          cognitoAuthenticationProvider: null,
          sourceIp: '127.0.0.1',
          accountId: null 
        },
        stage: 'prod' 
      },
      claims: null,
      apiGateway: true 
    });
  });

  it('converts S3 put event', function() {
    expect(events.standardizeEvent(app, S3_PUT, CONTEXT)).toEqual({
      method: 'S3PUT',
      stage: 'dev',
      path: '/uploads/HappyFace.jpg',
      params: '{name=HappyFace.jpg}',
      paramNames: '[name]',
      body: {
        Size: 1024,
        Bucket: 'sourcebucket'
      }
    });
  });

  it('rejects s3 delete event', function() {
    expect(events.standardizeEvent(app, S3_DELETE, CONTEXT)).toBeUndefined();
  });
  
  it('converts scheduled event', function() {
    expect(events.standardizeEvent(app, SCHEDULED_EVENT, CONTEXT)).toEqual({
      method: 'SCHEDULEDEVENT',
      stage: 'dev',
      path: '/my-schedule'
    });
  });
  
  it('converts api gateway authorizer event', function() {
    expect(events.standardizeEvent(app, API_GATEWAY_AUTHORIZER_EVENT, CONTEXT)).toEqual({
      method: 'APIGATEWAYAUTHORIZEREVENT',
      stage: 'dev',
      path: '/GET/auth',
      headers: {
        Authorization: 'Bearer foo'
      },
      body: {
        authorizationToken: 'Bearer foo',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012/dev/GET/auth',
        type: 'TOKEN' 
      }
    });
  });
  
  it('converts cognito event', function() {
    expect(events.standardizeEvent(app, COGNITO_EVENT, CONTEXT)).toEqual({
      method: 'COGNITOEVENT',
      stage: 'dev',
      path: '/PreSignUp_SignUp',
      body: { 
        'version': 1,
        'triggerSource': 'PreSignUp_SignUp',
        'region': 'us-east-1', 
        'userPoolId': 'abc',
        'callerContext': { 
          'awsSdkVersion': 'version', 
          'clientId': 'client' 
        },
        request: { 
          'userAttributes': {
            'name': 'bob' 
          } 
        }, 
        response: {}
      }
    });
  });
  
  it('converts DynamoDB Insert event', function() {
    expect(events.standardizeEvent(app, DYNAMODB_INSERT, CONTEXT)).toEqual({
      "method": "DYNAMODBINSERT",
      "stage": "dev",
      "path": "/T",
      "body": {
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
      } 
    });
  });
  
  it('converts Cloudwatch Logs event', function() {
    expect(events.standardizeEvent(app, CLOUDWATCH_LOGS_EVENT, CONTEXT)).toEqual({
      "method": "CLOUDWATCHLOGS",
      "stage": "dev",
      "path": "/testFilter",
      "body": {
        "messageType": "DATA_MESSAGE",
        "owner": "123456789123",
        "logGroup": "testLogGroup",
        "logStream": "testLogStream",
        "subscriptionFilters": [
          "testFilter"
        ],
        "logEvents": [
          {
            "id": "eventId1",
            "timestamp": 1440442987000,
            "message": "[ERROR] First test message"
          },
          {
            "id": "eventId2",
            "timestamp": 1440442987001,
            "message": "[ERROR] Second test message"
          }
        ]
      } 
    });
  });
  
  it('converts Kinesis Firehose Logs event', function() {
    expect(events.standardizeEvent(app, KINESIS_FIREHOSE_EVENT, CONTEXT)).toEqual({
      "method": "KINESISFIREHOSE",
      "stage": "dev",
      "path": "/dev-test",
      "body": KINESIS_FIREHOSE_EVENT.records 
    });
  });
  
});
