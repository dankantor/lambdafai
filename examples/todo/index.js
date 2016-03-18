var lambdafai = require('lambdafai');

lambdafai('todo-example', function(app) {
  // Define DynamoDB tables:
  app.table({ name: 'todos', key: ['id'] });

  // Define S3 buckets:
  app.bucket({ name: 'attachments' });

  // Define Lambdas:
  var todos = app.lambda({ name: 'todos', ram: 512 })

  // Implement endpoints:
  todos.get('/todos', function(req, res) {
    res.done(null, req);  // Echo back the request.
  });

  todos.get('/todos/:id', function(req, res) {
    res.done(null, req);  // Echo back the request.
  });
});
