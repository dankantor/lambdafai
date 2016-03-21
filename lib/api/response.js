var Response = function(opts) {
  this.isDone = false;

  // Define methods in this scope so that we have a reference to self.
  var self = this;
  self.done = function(error, payload) {
    if (!self.isDone) {
      self.isDone = true;
      self.error = error;
      self.payload = payload;
    } else {
      console.error('done() called multiple times on Response');
    }
    self.next();
  };

  self.send = function(payload) {
    self.done(null, payload);
  },

  self.next = function() {
    var callback = self._callback();
    if (callback) {
      self._callback = null;
      callback();
    }
  };
};

module.exports = Response;
