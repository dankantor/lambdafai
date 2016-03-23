var lambdafai = require('lambdafai');

lambdafai('lambdafai-hello-world', function(app) {
  app.lambda({ name: 'hello' })
     .get('/hello', function(req, res) {
    res.send('Hello, world!');
  });
});
