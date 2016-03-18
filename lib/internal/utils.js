var _ = require('lodash');

module.exports = {
  logSeparator: function() {
    console.log('===============================================================================');
  },

  checkIdentifier: function(identifier, description) {
    if (!/^[A-Za-z0-9-_]+$/.test(identifier)) {
      throw new Error('"' + identifier + '" is not a valid ' + description +
        ' (must contain only letters, numbers, hyphens and underscores).');
    }
  },

  replaceAll: function(str, from, to) {
    return str.split(from).join(to);
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
};
