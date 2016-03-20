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
  this.pass();
};

Response.prototype.pass = function() {
  var callback = this._callback();
  if (callback) {
    this._callback = null;
    callback();
  }
};

module.exports = Response;
