var lambdafai = require('lambdafai');
var db = lambdafai.database;
var errors = lambdafai.errors;

lambdafai('todo-example', function(app) {
  // Define DynamoDB tables:
  app.table({ name: 'todos', key: ['userID', 'todoID'] });

  // Define S3 buckets:
  app.bucket({ name: 'attachments' });

  // Define Lambdas:
  var todos = app.lambda({ name: 'todos', ram: 512 });

  // Add middleware to authenticate the user. For this demo, it just uses the "X-User" header.
  todos.use(function(req, res) {
    req.userID = req.headers['X-User'] || 'default';
    res.next();
  });

  // Implement CRUD endpoints:
  todos.get('/todos', function(req, res) {
    db.table(req, 'todos').list({
      HashKey: {
        userID: req.userID
      }
    }, res.done);
  });

  todos.get('/todos/:id', function(req, res) {
    db.table(req, 'todos').get({
      Key: {
        userID: req.userID,
        todoID: req.params.id,
      }
    }, res.done);
  });

  todos.post('/todos', function(req, res) {
    var item = req.body || {};
    item.userID = req.userID;
    item.todoID = new Date().getTime().toString(32);  // Assign a new ID based on the timestamp.
    db.table(req, 'todos').put({
      Item: item
    }, res.done);
  });

  todos.put('/todos/:id', function(req, res) {
    var item = req.body || {};
    item.userID = req.userID;
    item.todoID = req.params.id;
    db.table(req, 'todos').put({
      Item: item,
      AllowOverwrite: true
    }, res.done);
  });

  todos.delete('/todos/:id', function(req, res) {
    db.table(req, 'todos').delete({
      Key: {
        userID: req.userID,
        todoID: req.params.id
      }
    }, res.done);
  });
});
