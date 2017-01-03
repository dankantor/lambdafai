function makeError(statusCode, details) {
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
  }
};

module.exports = Errors;