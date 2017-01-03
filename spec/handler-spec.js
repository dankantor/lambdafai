var handler = require('../lib/handler');
var Application = require('../lib/api/application');


describe('#handler', function() {
  it('invokes lambda with request', function(testDone) {
    var app = new Application('my-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello/world', function(req, res) {
      expect(req.method).toEqual('GET');
      expect(req.path).toEqual('/hello/world');
      expect(req.headers).toEqual({
        'Content-Type': 'application/javascript',
        'Accept': '*/*, text/*'
      });
      expect(req.params).toEqual({});
      expect(req.query).toEqual({foo: 'bar'});
      expect(req.body).toEqual({ size: 'large' });
      res.done(null, { x: 123 });
    });


    
    var event = {
      "body": "{\"size\":\"large\"}",
      "resource": "/hello/world",
      "requestContext": {
        "resourcePath": "/hello/world",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "queryStringParameters": {
        "foo": "bar"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello/world"
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({'statusCode': 200, 'body': JSON.stringify({x: 123}), 'headers': {} });
        testDone();
      }
    };

    handler(app, event, context);
  });
  
  it('invokes lambda with correct response headers', function(testDone) {
    var app = new Application('my-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello/world', function(req, res) {
      expect(req.method).toEqual('GET');
      expect(req.path).toEqual('/hello/world');
      res.set('Content-Type', 'text/html');
      res.done(null, '<div>Hello, World!</div>');
    });

    var event = {
      "resource": "/hello/world",
      "requestContext": {
        "resourcePath": "/hello/world",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello/world"
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data.statusCode).toEqual(200);
        expect(data.body).toEqual('<div>Hello, World!</div>');
        expect(data.headers).toEqual({'Content-Type': 'text/html'});
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('routes request with path arguments', function(testDone) {
    var app = new Application('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello/:id', function(req, res) {
      expect(req.method).toEqual('GET');
      expect(req.path).toEqual('/hello/{id}');
      res.done(null, { x: 123 });
    });
    
    var event = {
      "resource": "/hello/{id}",
      "requestContext": {
        "resourcePath": "/hello/{id}",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello/1"
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({'statusCode': 200, 'body': JSON.stringify({x: 123}), 'headers': {} });
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('routes to correct handler based on method', function(testDone) {
    var app = new Application('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello/world', function(req, res) {
      expect.fail();
    });
    lambda.post('/hello/world', function(req, res) {
      expect(req.method).toEqual('POST');
      expect(req.path).toEqual('/hello/world');
      res.done(null, { x: 123 });
    });

    var event = {
      "resource": "/hello/world",
      "requestContext": {
        "resourcePath": "/hello/world",
        "httpMethod": "POST",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "POST",
      "path": "/hello/world"
    };
    
    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({'statusCode': 200, 'body': JSON.stringify({x: 123}), 'headers': {} });
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('returns 404 if no handler found', function(testDone) {
    var app = new Application('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello', function(req, res) { res.done(null, {}); });
    
    var event = {
      "resource": "/hello/world",
      "requestContext": {
        "resourcePath": "/hello/world",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello/world"
    };

    var context = {
      done: function(err, data) {
        expect(data.statusCode).toEqual(404);
        expect(data.body).toBeUndefined();
        testDone();
      }
    };

    handler(app, event, context);
  });
  
  it('returns 302 if res.redirect is called', function(testDone) {
    var app = new Application('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello', function(req, res) { 
      res.redirect('https://example.com');
    });

    var event = {
      "resource": "/hello",
      "requestContext": {
        "resourcePath": "/hello",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello"
    };

    var context = {
      done: function(err, data) {
        expect(data.statusCode).toEqual(302);
        expect(data.headers.location).toEqual('https://example.com');
        expect(data.body).toBeUndefined();
        testDone();
      }
    };

    handler(app, event, context);
  });
  
  it('sets arbitrary status codes', function(testDone) {
    var app = new Application('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello', function(req, res) { 
      res.statusCode = 201;
      res.send({'abc': 123});
    });

    var event = {
      "resource": "/hello",
      "requestContext": {
        "resourcePath": "/hello",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello"
    };

    var context = {
      done: function(err, data) {
        expect(data.statusCode).toEqual(201);
        expect(data.body).toBe('{"abc":123}');
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('executes middleware', function(testDone) {
    var app = new Application('test-app');

    // Add a middleware the executes on the app before the handler:
    app.use(function(req, res) {
      expect(res.isDone).toEqual(false);
      req.appMiddlewareParam = 1;
      res.next();
    });

    var lambda = app.lambda({ name: 'my-lambda' });

    // Add a middleware that executes on the Lambda before the handler:
    lambda.use(function(req, res) {
      expect(res.isDone).toEqual(false);
      req.lambdaMiddlewareParam = req.appMiddlewareParam + 1;
      res.next();
    });

    lambda.get('/hello', function(req, res) {
      res.done(null, [ req.appMiddlewareParam, req.lambdaMiddlewareParam ]);
    });

    // Add a middleware that executes on the Lambda after the handler.
    lambda.use(function(req, res) {
      expect(res.isDone).toEqual(true);
      res.body.push(3);
      res.next();
    });

    // Add a middleware that executes on the app after the handler.
    app.use(function(req, res) {
      expect(res.isDone).toEqual(true);
      res.body.push(4);
      res.next();
    });

    var event = {
      "resource": "/hello",
      "requestContext": {
        "resourcePath": "/hello",
        "httpMethod": "GET",
        "stage": "dev"
      },
      "headers": {
        "Content-Type": "application/javascript",
        "Accept": "*/*, text/*"
      },
      "queryStringParameters": null,
      "pathParameters": null,
      "httpMethod": "GET",
      "path": "/hello"
    };
    
    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({ 'statusCode': 200, 'body': JSON.stringify([ 1, 2, 3, 4 ]), 'headers': {} });
        testDone();
      }
    };

    handler(app, event, context);
  });

});
