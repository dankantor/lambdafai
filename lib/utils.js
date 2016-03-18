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
};