var lambdafai = require('lambdafai');

var app = lambdafai('todo-example');

// Define DynamoDB tables:
app.table({ name: 'todos', key: ['id'] });

// Define S3 buckets:
app.bucket({ name: 'attachments' });

// Define Lambdas:
var todos = app.lambda({ name: 'todos', ram: 512 })

// Implement endpoints:
todos.get('/todos', function(req, res) {
  res.done('Hello, world!');
});

app.ready();
