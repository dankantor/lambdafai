function makeError(statusCode, details) {
/*
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
*/
  //var error = new Error(message);
  // error.name = 'LambdafaiError';
  //error.statusCode = statusCode;
  //error.details = details;
  var error = {
    'statusCode': statusCode
  };
  var body = details;
  if (typeof details === 'object') {
    body = JSON.stringify(details);
  }
  error.body = body;
  if (details instanceof Error) {
    error.stack = details.stack;
    error.body = details.message;
  }
  return error;
}

/**
 * Use these functions to generate Errors that will cause specific HTTP status codes to be sent
 * down to the client in the response. For example, calling:
 * ```
 * res.done(errors.badRequest('body missing'));
 * ```
 * will cause the client to receive an HTTP 400 response with body:
 * ```
 * { "message": "HTTP 400: body missing" }
 * ```
 * @namespace
 */
var Errors = {
  /** @return {Error} an Error causing a HTTP 400 (Bad Request) status to be sent to the client. */
  badRequest: function(details) {
    return makeError(400, details);
  },

  /** @return {Error} an Error causing a HTTP 401 (Unauthorized) status to be sent to the client. */
  unauthorized: function(details) {
    return makeError(401, details);
  },

  /** @return {Error} an Error causing a HTTP 403 (Forbidden) status to be sent to the client. */
  forbidden: function(details) {
    return makeError(403, details);
  },

  /** @return {Error} an Error causing a HTTP 404 (Not Found) status to be sent to the client. */
  notFound: function(details) {
    return makeError(404, details);
  },

  /** @return {Error} an Error causing a HTTP 409 (Conflict) status to be sent to the client. */
  conflict: function(details) {
    return makeError(409, details);
  },

  /** @return {Error} an Error causing a HTTP 500 (Server Error) status to be sent to the client. */
  serverError: function(details) {
    return makeError(500, details);
  },

  /**
   * @return {Error} an Error causing a HTTP 503 (Service Unavailable) status to be sent to the
   * client.
   */
  serviceUnavailable: function(details) {
    return makeError(503, details);
  },

  // Wraps arbitrary errors or objects as 503 service unavailable errors. If the error is already
  // a Lambdafai error, this will pass it through unchanged. If the error is a LambdafaiRedirect, switch
  // the name and details so it can be parsed by API Gateway.
/*
  wrap: function(error) {
    if (error === undefined || error === null || error.name == 'LambdafaiError') {
      return error;
    } else if (error.name && error.name === 'LambdafaiRedirect') {
      error.name = error.details;
      error.details = 'LambdafaiRedirect';
      return error;
    } else if (error instanceof Error) {
      var lambdafaiError = Errors.serverError(error.message);
      lambdafaiError.stack = error.stack;
      return lambdafaiError;
    } else {
      return Errors.serverError(error);
    }
  },
*/
};

module.exports = Errors;
