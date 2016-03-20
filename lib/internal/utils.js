var _ = require('lodash');

module.exports = {
  logSeparator: function() {
    console.log('===============================================================================');
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
