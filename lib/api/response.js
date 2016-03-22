/**
 * Represents a response. These are passed to handlers and middleware, and are constructed by
 * the framework. You should not call this constructor directly, except from tests.
 *
 * @constructor
 * @property {boolean} isDone - true if the response has been finalized by someone calling
 *                     {@link Response#done} on it; false otherwise
 * @property {Error} error the error, if any
 * @property {object} body the body of the response, if any
 */
var Response = function() {
  this.isDone = false;

  // Define methods in this scope so that we have a reference to self.
  var self = this;
  self.done = function(error, body) {
    if (!self.isDone) {
      self.isDone = true;
      self.error = error;
      self.body = body;
    } else {
      console.error('done() called multiple times on Response');
    }
    self.next();
  };

  self.send = function(body) {
    self.done(null, body);
  },

  self.next = function() {
    var callback = self._callback;
    if (callback) {
      self._callback = null;
      callback();
    }
  };
};

// These are defined solely for the benefit of JSDoc. The actual implementations are above:

/**
 * Called by handlers or middleware to finalize a response to the user and pass control to the
 * next stage. Only one of error or body should be specified. This method should only be called
 * once in the entire middleware and handler chain.
 *
 * @param {Error} error - the error, if any to return to the user; to trigger specific HTTP status
 *                codes, see {@link Errors}
 * @param {object} body - the body to return in the response
 */
Response.prototype.done = function(error, body) {}

/** Shorthand for calling `{@link Response#done}(null, body)` */
Response.prototype.send = function(body) {}

/** Invoked by middleware to pass control to the next middleware without finalizing a response. */
Response.prototype.next = function() {}

module.exports = Response;
