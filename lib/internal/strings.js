var IDENTIFIER_RE = /^[A-Za-z0-9-_]+$/;

var Strings = {
  // Parses the stupid format that Amazon uses for dictionaries.
  parseAmazonDictionary: function(namesString, pairsString) {
    var result = {};
    if (namesString && pairsString) {
      var names = namesString.substring(1, namesString.length - 1).split(', ');
      pairsString = ', ' + pairsString.substring(1, pairsString.length - 1);

      while (names.length) {
        var name = names.pop();
        if (name.length > 0) {
          var index = pairsString.lastIndexOf(', ' + name + '=');
          if (index < 0) {
            console.warn('Unable to find name: "' + name + '"');
            return undefined;
          }
          var param = pairsString.substring(index + 2);
          var key = param.substring(0, name.length);
          var value = param.substring(name.length + 1);
          result[key] = value;

          pairsString = pairsString.substring(0, index);
        }
      }
    }
    return result;
  },

  toAmazonDictionaryNames: function(dict) {
    if (dict) {
      var names = Object.getOwnPropertyNames(dict).sort();
      return '[' + names.join(', ') + ']';
    }
  },

  toAmazonDictionaryPairs: function(dict) {
    if (dict) {
      var names = Object.getOwnPropertyNames(dict).sort();
      var parts = [];
      for (var i = 0; i < names.length; i++) {
        parts.push(names[i] + '=' + dict[names[i]]);
      }
      return '{' + parts.join(', ') + '}';
    }
  },

  checkIdentifier: function(identifier, description) {
    description = description || 'identifier';
    if (!identifier || !IDENTIFIER_RE.test(identifier)) {
      throw new Error('"' + identifier + '" is not a valid ' + description +
        ' (must contain only A-Z, a-z, 0-9, -, _)');
    }
    return true;
  },

  replaceAll: function(str, from, to) {
    return str.split(from).join(to);
  },
};

module.exports = Strings;
