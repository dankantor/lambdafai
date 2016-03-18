var _ = require('lodash');
var Lambda = require('./lambda');
var utils = require('../utils');

var App = function(name, readyCallback) {
  utils.checkIdentifier(name, 'app name');
  this.readyCallback = readyCallback;
  this.config = {
    name: name,
    tables: {},
    lambdas: {},
    buckets: {},
  };
};

App.prototype.ready = function() {
  var config = _.cloneDeep(this.config);

  // Replace the Lambda objects with their configs.
  _.forIn(_.keys(config.lambdas), function(name) {
    config.lambdas[name] = config.lambdas[name].config;
  });

  this.readyCallback(config);
};

App.prototype.table = function(opts) {
  utils.checkIdentifier(opts.name, 'table name');
  this.config.tables[opts.name] = {
    name: opts.name,
    key: opts.key,
  };
};

App.prototype.lambda = function(opts) {
  var lambda = new Lambda(this, opts);
  this.config.lambdas[opts.name] = lambda;
  return lambda;
};

App.prototype.bucket = function(opts) {
  utils.checkIdentifier(opts.name, 'bucket name');
  var bucket = {
    name: opts.name,
    acl: opts.acl || 'private'
  };
  this.config.buckets[opts.name] = bucket;
};

module.exports = App;
