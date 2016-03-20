function makeError(status, details) {
  var message = 'HTTP ' + status;
  if (typeof details == 'string') {
    message = message + ': ' + details;
  } else if (details) {
    message = message + ': ' + JSON.stringify(details);
  }
  var error = new Error(message);
  error.name = 'LambdafaiError';
  error.status = status;
  error.details = details;
  return error;
}

var Errors = {
  badRequest: function(details) {
    return makeError(400, details);
  },

  unauthorized: function(details) {
    return makeError(401, details);
  },

  forbidden: function(details) {
    return makeError(403, details);
  },

  notFound: function(details) {
    return makeError(404, details);
  },

  conflict: function(details) {
    return makeError(409, details);
  },

  serverError: function(details) {
    return makeError(500, details);
  },

  serviceUnavailable: function(details) {
    return makeError(503, details);
  },

  forStatus: function(status, details) {
    return makeErrors(status, details);
  },

  // Wraps arbitrary errors or objects as 503 service unavailable errors. If the error is already
  // a Lambdafai error, this will pass it through unchanged.
  wrap: function(error) {
    if (error === undefined || error === null || error.name == 'LambdafaiError') {
      return error;
    } else if (error instanceof Error) {
      var lambdafaiError = Errors.serverError(error.message);
      lambdafaiError.stack = error.stack;
      return lambdafaiError;
    } else {
      return Errors.serverError(error);
    }
  },

  suppressStack: function(error) {
    if (error && error.stack) {
      error.stack = '';
    }
    return error;
  }
};

module.exports = Errors;
