var expect = require('chai').expect;
var errors = require('../../lib/api/errors');

describe("Errors", function() {
  it("error is constructed properly", function() {
    var error = errors.badRequest('Did not supply credentials');
    expect(error.message).to.equal('HTTP 400: Did not supply credentials');
    expect(error.status).to.equal(400);
    expect(error.details).to.equal('Did not supply credentials');
    expect(error.name).to.equal('LambdafaiError');
  });

  it("error converts objects to strings", function() {
    var error = errors.badRequest([{a: 'b'}, {c: 'd'}]);
    expect(error.message).to.equal('HTTP 400: [{"a":"b"},{"c":"d"}]');
    expect(error.details[0].a).to.equal('b');
  });

  it("unauthorized", function() {
    var error = errors.unauthorized();
    expect(error.message).to.equal('HTTP 401');
    expect(error.status).to.equal(401);
  });

  it("forbidden", function() {
    var error = errors.forbidden();
    expect(error.message).to.equal('HTTP 403');
    expect(error.status).to.equal(403);
  });

  it("notFound", function() {
    var error = errors.notFound();
    expect(error.message).to.equal('HTTP 404');
    expect(error.status).to.equal(404);
  });

  it("conflict", function() {
    var error = errors.conflict();
    expect(error.message).to.equal('HTTP 409');
    expect(error.status).to.equal(409);
  });

  it("serverError", function() {
    var error = errors.serverError();
    expect(error.message).to.equal('HTTP 500');
    expect(error.status).to.equal(500);
  });

  it("serviceUnavailable", function() {
    var error = errors.serviceUnavailable();
    expect(error.message).to.equal('HTTP 503');
    expect(error.status).to.equal(503);
  });

  describe("wrap", function() {
    it("wraps errors", function() {
      var error = errors.wrap(new Error('Ugh'));
      expect(error.message).to.equal('HTTP 500: Ugh');
      expect(error.status).to.equal(500);
      expect(error.details).to.equal('Ugh');
    });

    it("wraps strings", function() {
      var error = errors.wrap('Failure');
      expect(error.message).to.equal('HTTP 500: Failure');
      expect(error.status).to.equal(500);
      expect(error.details).to.equal('Failure');
    });

    it("does not double wrap errors", function() {
      var error = errors.wrap(errors.badRequest());
      expect(error.message).to.equal('HTTP 400');
      expect(error.status).to.equal(400);
    });

    it("does not wrap undefined or null", function() {
      expect(errors.wrap(undefined)).to.be.undefined;
      expect(errors.wrap(null)).to.be.null;
    });
  });
});
