var _ = require('lodash');

var Callbacks = {
  // Callback wrapper that ignores errors with codes in a given list.
  ignoreErrors: function(errorCodes, callback) {
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
  stripData: function(callback) {
    return function(err) {
      callback(err);
    };
  },

  // Callback that waits an amount of time after a successful invocation.
  waitAfterSuccess: function(seconds, callback) {
    return function(err, result) {
      if (!err && seconds > 0) {
        console.log('Waiting for ' + seconds + ' sec');
        setTimeout(function() {
          callback(err, result);
        }, seconds * 1000);
      } else {
        callback(err);
      }
    };
  }
};

module.exports = Callbacks;
