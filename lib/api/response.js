var Response = function(opts) {
  this.isDone = false;
};

Response.prototype.done = function(error, payload) {
  if (!this.isDone) {
    this.isDone = true;
    this.error = error;
    this.payload = payload;
  } else {
    console.error('done() called multiple times on Response');
  }
  this.next();
};

Response.prototype.next = function() {
  var callback = this._callback();
  if (callback) {
    this._callback = null;
    callback();
  }
};

module.exports = Response;
