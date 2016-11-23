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
  this.header = {};

  // Define methods in this scope so that we have a reference to self.
  var self = this;
  self.done = function(error, body) {
    if (!self.isDone) {
      self.isDone = true;
      self.statusCode = 200;
      self.body = body;
      if (error) {
        self.error = true;
        self.statusCode = error.statusCode;
        self.body = error.body;
      }
    } else {
      console.error('done() called multiple times on Response');
    }
    self.next();
  };

  self.send = function(body) {
    self.done(null, body);
  };

  self.next = function() {
    var callback = self._callback;
    if (callback) {
      self._callback = null;
      callback();
    }
  };
  
  self.set = function(headerKey, headerValue) {
    self.header[headerKey] = headerValue;
  };
  
  self.redirect = function(location) {
    self.isDone = true;
    self.statusCode = 302;
    self.header.location = location;
    self.next();
  };
  
};

/**
 * Returns a response that can be used for testing; the callback is invoked when the Response's
 * done(), send(), or next() handlers are invoked.
 */
Response.newTestingResponse = function(callback) {
  var res = new Response();
  res._callback = callback;
  return res;
};


// These are defined solely for the benefit of JSDoc. The actual implementations are above:

/**
 * Called by handlers or middleware to finalize a response to the user and pass control to the
 * next stage. Only one of error or body should be specified. This method should only be called
 * once in the entire middleware and handler chain.
 *
 * @param {Error} error - the error, if any to return upstream;
 *                
 * @param {object} body - the body to return in the response
 */
Response.prototype.done = function(error, body) {};

/** Shorthand for calling `{@link Response#done}(null, body)` */
Response.prototype.send = function(body) {};

/** Invoked by middleware to pass control to the next middleware without finalizing a response. */
Response.prototype.next = function() {};

/**
 * @param {string} headerKey - the name of the header to set on the response
 * @param {string} headerValue - the name of the header to set on the response
 */
Response.prototype.set = function(headerKey, headerValue) {};

/**
 * @param {string} location - the url to 302 redirect to
 */
Response.prototype.redirect = function(location) {};

module.exports = Response;
