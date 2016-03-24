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

  matchPath: function(template, path) {
    var templateParts = Paths.splitPath(template);
    var pathParts = Paths.splitPath(path);
    if (templateParts.length != pathParts.length) {
      return undefined;
    }
    var matches = {};
    for (var i = 0; i < templateParts.length; i++) {
      if (templateParts[i].length > 1 && templateParts[i][0] === ':') {
        var key = templateParts[i].substring(1);
        matches[key] = pathParts[i];
      } else if (templateParts[i] != pathParts[i]) {
        return undefined;
      }
    }
    return matches;
  },

  expand: function(template, params) {
    var parts = Paths.splitPath(template);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i][0] == ':') {
        var value = params[parts[i].substring(1)];
        if (value) {
          parts[i] = value;
        }
      }
    }
    return Paths.joinPath(parts);
  }
};

module.exports = Paths;
