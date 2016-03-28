# lambdafai  [![Build Status](https://travis-ci.org/Clarifai/lambdafai.svg?branch=master)](https://travis-ci.com/Clarifai/lambdafai)

Lambdafai is a simple framework for building and deploying REST APIs using AWS Lambda, API Gateway,
DynamoDB, and S3. It consists of:
  * A library for routing and handling requests with [Express](http://expressjs.com/)-like syntax.
  * A command-line tool for creating, testing, and deploying your API.
  * A standard library to simplify interacting with AWS services like DynamoDB.
    * Using this library is optional - you can interact directly with the AWS APIs if you want

#### Code
```js
var lambdafai = require('lambdafai');

lambdafai('hello-world', function(app) {
  var hello = app.lambda({ name: 'hello' });
  hello.get('/hello', function(req, res) {
    res.send('Hello, world!');
  });
});
```

#### Create
```
node index.js create-resources dev
```

#### Test
```
node index.js invoke dev '{path: "/hello"}'
```

#### Deploy
```
node index.js deploy dev
```

#### Ship
```
node index.js promote dev prod
```


## Getting Started

The easiest way to get started is to jump into the
[Hello World example](https://github.com/Clarifai/lambdafai/tree/master/examples/hello-world).
This demonstrates how to use Lambdafai in a development workflow using the command-line tool.

The [TODO example](https://github.com/Clarifai/lambdafai/tree/master/examples/todo) is a more
complete example that demonstrates how to use DynamoDB support and middleware.

View the full generated API Reference by running:
```
npm run jsdoc
```
