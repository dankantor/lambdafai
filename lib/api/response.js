/**
 * Represents a response. These are passed to handlers and middleware, and are constructed by
 * the framework. You should not call this constructor directly.
 *
 * @constructor
 * @property {boolean} isDone - true if the response has been finaliezd by someone calling
 *                     {@link Response#done} on it; false otherwise
 */
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

// These are defined solely for the benefit of JSDoc. The actual implementations are above:

/**
 * Called by handlers or middleware to finalize a response to the user and pass control to the
 * next stage. Only one of error or payload should be specified. This method should only be called
 * once in the entire middleware and handler chain.
 *
 * @param {Error} error - the error, if any to return to the user; to trigger specific HTTP status
 *                codes, see {@link Errors}
 * @param {object} payload - the body to return in the response
 */
Response.prototype.done = function(error, payload) {}

/** Shorthand for calling `{@link Response#done}(null, payload)` */
Response.prototype.send = function(payload) {}

/** Invoked by middleware to pass control to the next middleware without finalizing a response. */
Response.prototype.next = function() {}

module.exports = Response;
