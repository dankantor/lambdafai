var handler = require('../lib/handler');
var App = require('../lib/api/app');


describe('#handler', function() {
  it('invokes lambda with request', function(testDone) {
    var app = new App('my-app');
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
      method: 'GET',
      path: '/hello/world',
      headers: '{Content-Type=application/javascript, Accept=*/*, text/*}',
      headerNames: '[Content-Type, Accept]',
      params: '{}',
      paramNames: '[]',
      query: '{foo=bar}',
      queryNames: '[foo]',
      body: {
        size: 'large',
      },
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({ x: 123 });
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('routes request with path arguments', function(testDone) {
    var app = new App('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello/:id', function(req, res) {
      expect(req.method).toEqual('GET');
      expect(req.path).toEqual('/hello/:id');
      res.done(null, { x: 123 });
    });

    var event = {
      method: 'GET',
      path: '/hello/{id}',
      headers: '{Content-Type=application/javascript, Accept=*/*, text/*}',
      headerNames: '[Content-Type, Accept]',
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({ x: 123 });
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('routes to correct handler based on method', function(testDone) {
    var app = new App('test-app');
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
      method: 'POST',
      path: '/hello/world',
    };

    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual({ x: 123 });
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('returns 404 if no handler found', function(testDone) {
    var app = new App('test-app');
    var lambda = app.lambda({ name: 'my-lambda' });

    lambda.get('/hello', function(req, res) { res.done(null, {}); });

    var event = {
      method: 'GET',
      path: '/hello/world',
      headers: '{Content-Type=application/javascript, Accept=*/*, text/*}',
      headerNames: '[Content-Type, Accept]',
    };

    var context = {
      done: function(err, data) {
        expect(err.message.indexOf('HTTP 404')).toEqual(0);
        expect(data).toBeUndefined();
        testDone();
      }
    };

    handler(app, event, context);
  });

  it('executes middleware', function(testDone) {
    var app = new App('test-app');

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
      res.payload.push(3);
      res.next();
    });

    // Add a middleware that executes on the app after the handler.
    app.use(function(req, res) {
      expect(res.isDone).toEqual(true);
      res.payload.push(4);
      res.next();
    });

    var event = { method: 'GET', path: '/hello' };
    var context = {
      done: function(err, data) {
        expect(err).toBeNull();
        expect(data).toEqual([ 1, 2, 3, 4 ]);
        testDone();
      }
    };

    handler(app, event, context);
  });

});
