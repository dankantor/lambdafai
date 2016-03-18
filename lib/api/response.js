var Response = function(opts, next) {
  this.next = next;
};

Response.prototype.done = function(err, payload) {
  this.next(err, payload);
}

module.exports = Response;
