var _ = require('lodash');

var LINE = '==============================================================================';

module.exports = {
  logBanner: function(text) {
    console.log('\n' + LINE);
    if (text) {
      console.log(text);
      console.log(LINE);
    }
  },

  ignoringErrorCodes: function(errorCodes, callback) {
    if (errorCodes === '*') {
      return function(err, result) {
        callback(null, result);
      };
    } else {
      return function(err, result) {
        if (err && err.code && _.castArray(errorCodes).indexOf(err.code) >= 0) {
          err = null;
        }
        callback(err, result);
      };
    }
  },

  // Callback that passes through errors but not data.
  strippingData: function(callback) {
    return function(err) {
      callback(err);
    };
  },
};
