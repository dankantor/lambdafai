var _ = require('lodash');
var Lambda = require('./lambda');
var utils = require('../utils');

var App = function(name, launchCallback) {
  utils.checkIdentifier(name, 'app name');
  this._launchCallback = launchCallback;
  this.name = name;
  this.tables = {};
  this.lambdas = {};
  this.buckets = {};
};

App.prototype.launch = function() {
  this._launchCallback(this);
};

App.prototype.table = function(opts) {
  utils.checkIdentifier(opts.name, 'table name');
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
  utils.checkIdentifier(opts.name, 'bucket name');
  var bucket = {
    name: opts.name,
    acl: opts.acl || 'private'
  };
  this.buckets[opts.name] = bucket;
};

module.exports = App;
