var lambdafai = require('lambdafai');

lambdafai('lambdafai-hello-world', function(app) {
  var hello = app.lambda({ name: 'hello' });
  hello.get('/hello', function(req, res) {
    res.send('Hello, world!');
  });
});
