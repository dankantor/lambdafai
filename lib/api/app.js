var _ = require('lodash');
var Lambda = require('./lambda');
var strings = require('../internal/strings');

var App = function(name) {
  strings.checkIdentifier(name, 'app name');
  this.name = name;
  this.tables = {};
  this.lambdas = {};
  this.buckets = {};
};

App.prototype.table = function(opts) {
  strings.checkIdentifier(opts.name, 'table name');
  this.tables[opts.name] = {
    name: opts.name,
    key: opts.key,
  };
};

App.prototype.lambda = function(opts) {
  var lambda = new Lambda(this, opts);
  this.lambdas[opts.name] = lambda;
  return lambda;
};

App.prototype.bucket = function(opts) {
  strings.checkIdentifier(opts.name, 'bucket name');
  var bucket = {
    name: opts.name,
    acl: opts.acl || 'private'
  };
  this.buckets[opts.name] = bucket;
};

App.prototype.findRoute = function(method, path) {
  var lambdas = _.values(this.lambdas);
  for (var i = 0; i < lambdas.length; i++) {
    var route = lambdas[i].findRoute(method, path);
    if (route) {
      return route;
    }
  }
};

module.exports = App;
