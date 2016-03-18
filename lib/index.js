var App = require('./api/app');

var lambdafai = function(name) {
  return new App(name, require('./main'));
};

module.exports = lambdafai;
