var _ = require('lodash');

var Request = function(opts) {
  this.method = opts.method || 'GET';
  this.path = opts.path || '';
  this.headers = opts.headers || {};
  this.params = opts.params || {};
  this.query = opts.query || {};
  this.body = opts.body;
};

module.exports = Request;
