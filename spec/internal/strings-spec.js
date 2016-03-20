var strings = require('../../lib/internal/strings');


describe('#parseAmazonDictionary', function() {
  it('parses Amazon dictionaries', function() {
    expect(strings.parseAmazonDictionary(null, null)).toEqual({});
    expect(strings.parseAmazonDictionary(null, '{}')).toEqual({});
    expect(strings.parseAmazonDictionary('[]', null)).toEqual({});
    expect(strings.parseAmazonDictionary('', '')).toEqual({});
    expect(strings.parseAmazonDictionary('[]', '{}')).toEqual({});
    expect(strings.parseAmazonDictionary('[id]', '{id=abc123}')).toEqual({id: 'abc123'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123, bar=xyz}'))
        .toEqual({foo: '123', bar: 'xyz'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123, 456, bar=xyz=abc}'))
        .toEqual({foo: '123, 456', bar: 'xyz=abc'});
    expect(strings.parseAmazonDictionary('[foo, bar]', '{foo=123,foo=456, bar=1}'))
        .toEqual({foo: '123,foo=456', bar: '1'});
    expect(strings.parseAmazonDictionary('[Accept, Accept-Language]',
        '{Accept=*/*, Accept-Language=en-US,en;q=0.8}'))
        .toEqual({Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.8'});
  });

  it('handles bad dictionaries', function() {
    expect(strings.parseAmazonDictionary('[id]', '{foo=bar}')).toBeUndefined();
    expect(strings.parseAmazonDictionary('[id]', '{foo=id}')).toBeUndefined();
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
      expect(e.message).toEqual(
          '"undefined" is not a valid identifier (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });

  it('throws on empty identifier', function(done) {
    try { strings.checkIdentifier(''); } catch (e) {
      expect(e.message).toEqual(
          '"" is not a valid identifier (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });

  it('throws on identifier with invalid characters', function(done) {
    try { strings.checkIdentifier('hello world', 'name'); } catch (e) {
      expect(e.message).toEqual(
          '"hello world" is not a valid name (must contain only A-Z, a-z, 0-9, -, _)');
      done();
    }
  });
});
