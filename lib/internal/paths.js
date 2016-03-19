var Paths = {
  // Converts an API gateway path to an Express path.
  gatewayToExpress: function(path) {
    if (path) {
      var parts = path.split('/');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.length > 2 && part[0] == '{' && part[part.length - 1] == '}') {
          parts[i] = ':' + part.substring(1, part.length - 1);
        }
      }
      path = parts.join('/');
    }
    return path;
  },

  expressToGateway: function(path) {
    if (path) {
      var parts = path.split('/');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.length > 1 && part[0] == ':') {
          parts[i] = '{' + part.substring(1) + '}';
        }
      }
      path = parts.join('/');
    }
    return path;
  },

  splitPath: function(path) {
    return path.split('/').slice(1);
  },

  joinPath: function(parts) {
    return '/' + parts.join('/');
  },
};

module.exports = Paths;
