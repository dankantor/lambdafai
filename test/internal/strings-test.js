var expect = require('chai').expect;
var strings = require('../../lib/internal/strings');


describe('#parseAmazonDictionary', function() {
  it('parses Amazon dictionaries', function() {
    expect(strings.parseAmazonDictionary(null, null)).to.deep.equal({});
    expect(strings.parseAmazonDictionary(null, '{}')).to.deep.equal({});
    expect(strings.parseAmazonDictionary('[]', null)).to.deep.equal({});
    expect(strings.parseAmazonDictionary('', '')).to.deep.equal({});
    expect(strings.parseAmazonDictionary('[]', '{}')).to.deep.equal({});
    expect(strings.parseAmazonDictionary('[id]', '{id=abc123}')).to.deep.equal({id: 'abc123'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123, bar=xyz}'))
        .to.deep.equal({foo: '123', bar: 'xyz'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123, 456, bar=xyz=abc}'))
        .to.deep.equal({foo: '123, 456', bar: 'xyz=abc'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123,foo=456, bar=1}'))
        .to.deep.equal({foo: '123,foo=456', bar: '1'});
    expect(strings.parseAmazonDictionary('[Accept, Accept-Language]',
        '{Accept=*/*, Accept-Language=en-US,en;q=0.8}'))
        .to.deep.equal({Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.8'});
  });

  it('handles bad dictionaries', function() {
    expect(strings.parseAmazonDictionary('[id]', '{foo=bar}')).to.be.undefined;
    expect(strings.parseAmazonDictionary('[id]', '{foo=id}')).to.be.undefined;
  });
});

describe('#checkIdentifier', function() {
  it('allows valid identifiers', function() {
    expect(strings.checkIdentifier('x'));
    expect(strings.checkIdentifier('abc123'));
    expect(strings.checkIdentifier('a_b-c'));
    expect(strings.checkIdentifier('HelloWorld'));
  });

  it('throws on undefined identifier', function(done) {
    try { strings.checkIdentifier(); } catch (e) {
      expect(e.message).to.equal(
          '"undefined" is not a valid identifier (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });

  it('throws on empty identifier', function(done) {
    try { strings.checkIdentifier(''); } catch (e) {
      expect(e.message).to.equal(
          '"" is not a valid identifier (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });

  it('throws on identifier with invalid characters', function(done) {
    try { strings.checkIdentifier('hello world', 'name'); } catch (e) {
      expect(e.message).to.equal(
          '"hello world" is not a valid name (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });
});
