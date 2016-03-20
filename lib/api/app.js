var _ = require('lodash');
var Lambda = require('./lambda');
var strings = require('../internal/strings');

function checkUniqueName(array, name, description) {
  if (_.find(array, { name: name })) {
    throw new Error('Multiple ' + description + ' are named "' + name + '" in application');
  }
}

var App = function(name) {
  strings.checkIdentifier(name, 'app name');
  this.name = name;
  this.tables = [];
  this.lambdas = [];
  this.buckets = [];
};

App.prototype.table = function(opts) {
  strings.checkIdentifier(opts.name, 'table name');
  checkUniqueName(this.tables, opts.name, 'tables');
  this.tables.push({
    name: opts.name,
    key: opts.key,
  });
};

App.prototype.lambda = function(opts) {
  var lambda = new Lambda(this, opts);
  checkUniqueName(this.lambdas, lambda.name, 'lambdas');
  this.lambdas.push(lambda);
  return lambda;
};

App.prototype.bucket = function(opts) {
  strings.checkIdentifier(opts.name, 'bucket name');
  checkUniqueName(this.buckets, opts.name, 'buckets');
  this.buckets.push({
    name: opts.name,
    acl: opts.acl || 'private'
  });
};

App.prototype.findRoute = function(method, path) {
  for (var i = 0; i < this.lambdas.length; i++) {
    var route = this.lambdas[i].findRoute(method, path);
    if (route) {
      return route;
    }
  }
};

module.exports = App;
