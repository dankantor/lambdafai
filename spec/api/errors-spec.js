var errors = require('../../lib/api/errors');

describe("Errors", function() {
  it("error is constructed properly", function() {
    var error = errors.badRequest('Did not supply credentials');
    expect(error.statusCode).toEqual(400);
    expect(error.body).toEqual('Did not supply credentials');
  });

  it("error converts objects to strings", function() {
    var error = errors.badRequest([{a: 'b'}, {c: 'd'}]);
    expect(error.statusCode).toEqual(400);
    expect(error.body).toEqual('[{"a":"b"},{"c":"d"}]');
  });

  it("unauthorized", function() {
    var error = errors.unauthorized();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(401);
  });

  it("forbidden", function() {
    var error = errors.forbidden();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(403);
  });

  it("notFound", function() {
    var error = errors.notFound();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(404);
  });

  it("conflict", function() {
    var error = errors.conflict();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(409);
  });

  it("serverError", function() {
    var error = errors.serverError();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(500);
  });

  it("serviceUnavailable", function() {
    var error = errors.serviceUnavailable();
    expect(error.body).toBeUndefined();
    expect(error.statusCode).toEqual(503);
  });
});
