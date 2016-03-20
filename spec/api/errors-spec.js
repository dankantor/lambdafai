var errors = require('../../lib/api/errors');

describe("Errors", function() {
  it("error is constructed properly", function() {
    var error = errors.badRequest('Did not supply credentials');
    expect(error.message).toEqual('HTTP 400: Did not supply credentials');
    expect(error.status).toEqual(400);
    expect(error.details).toEqual('Did not supply credentials');
    expect(error.name).toEqual('LambdafaiError');
  });

  it("error converts objects to strings", function() {
    var error = errors.badRequest([{a: 'b'}, {c: 'd'}]);
    expect(error.message).toEqual('HTTP 400: [{"a":"b"},{"c":"d"}]');
    expect(error.details[0].a).toEqual('b');
  });

  it("unauthorized", function() {
    var error = errors.unauthorized();
    expect(error.message).toEqual('HTTP 401');
    expect(error.status).toEqual(401);
  });

  it("forbidden", function() {
    var error = errors.forbidden();
    expect(error.message).toEqual('HTTP 403');
    expect(error.status).toEqual(403);
  });

  it("notFound", function() {
    var error = errors.notFound();
    expect(error.message).toEqual('HTTP 404');
    expect(error.status).toEqual(404);
  });

  it("conflict", function() {
    var error = errors.conflict();
    expect(error.message).toEqual('HTTP 409');
    expect(error.status).toEqual(409);
  });

  it("serverError", function() {
    var error = errors.serverError();
    expect(error.message).toEqual('HTTP 500');
    expect(error.status).toEqual(500);
  });

  it("serviceUnavailable", function() {
    var error = errors.serviceUnavailable();
    expect(error.message).toEqual('HTTP 503');
    expect(error.status).toEqual(503);
  });

  describe("wrap", function() {
    it("wraps errors", function() {
      var error = errors.wrap(new Error('Ugh'));
      expect(error.message).toEqual('HTTP 500: Ugh');
      expect(error.status).toEqual(500);
      expect(error.details).toEqual('Ugh');
    });

    it("wraps strings", function() {
      var error = errors.wrap('Failure');
      expect(error.message).toEqual('HTTP 500: Failure');
      expect(error.status).toEqual(500);
      expect(error.details).toEqual('Failure');
    });

    it("does not double wrap errors", function() {
      var error = errors.wrap(errors.badRequest());
      expect(error.message).toEqual('HTTP 400');
      expect(error.status).toEqual(400);
    });

    it("does not wrap undefined or null", function() {
      expect(errors.wrap(undefined)).toBeUndefined();
      expect(errors.wrap(null)).toBeNull();
    });
  });
});
