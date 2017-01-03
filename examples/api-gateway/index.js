var lambdafai = require('lambdafai');

lambdafai('lambdafai-api-gateway-examples', function(app) {
  
  var myLambda = app.lambda({ name: 'my-lambda' });
  
  // redirect a GET request to a new location
  hello.get('/redirect', function(req, res) {
    res.redirect('https://clarifai.com');
  });
  
  // set an arbitrary status code
  hello.get('/status', function(req, res) {
    res.statusCode = 201;
    res.send({
      'created': true
    });
  });
  
  // set an arbitrary header
  hello.get('/header', function(req, res) {
    res.set('X-My-Header', 'Foo');
    res.send({
      'ok': true
    });
  });
  
  // handle CORS OPTIONS request
  hello.options('/foo', function(req, res) {
    res.set('Access-Control-Allow-Headers', 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token');
    res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Origin', '*');
    res.send();
  });
  
  // Set routes to use Cognito User Pools as a custom authorizer
  hello.get('/me', function(req, res) {
    res.send({
      'auth': true
    });
  }, {'authorizationType': 'COGNITO_USER_POOLS', 'authorizerId': 'my-auth-id'});
  
  
});
