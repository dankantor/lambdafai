var paths = require('../../lib/internal/paths');


describe('Paths#gatewayToExpress', function() {
  it('should convert API gateway paths to express paths', function() {
    expect(paths.gatewayToExpress()).toBeUndefined();
    expect(paths.gatewayToExpress('')).toEqual('');
    expect(paths.gatewayToExpress('/')).toEqual('/');
    expect(paths.gatewayToExpress('/hello')).toEqual('/hello');
    expect(paths.gatewayToExpress('/hello/world')).toEqual('/hello/world');
    expect(paths.gatewayToExpress('/{hello}')).toEqual('/:hello');
    expect(paths.gatewayToExpress('/{hello}/')).toEqual('/:hello/');
    expect(paths.gatewayToExpress('/{hello}/world')).toEqual('/:hello/world');
    expect(paths.gatewayToExpress('/{hello}/{world}')).toEqual('/:hello/:world');
    expect(paths.gatewayToExpress('/{hello}/world/{goodbye}')).toEqual('/:hello/world/:goodbye');
    expect(paths.gatewayToExpress('/{hello}//x')).toEqual('/:hello//x');
  });
});

describe('Paths#expressToGateway', function() {
  it('should convert express paths to API gateway paths', function() {
    expect(paths.expressToGateway()).toBeUndefined();
    expect(paths.expressToGateway('')).toEqual('');
    expect(paths.expressToGateway('/')).toEqual('/');
    expect(paths.expressToGateway('/hello')).toEqual('/hello');
    expect(paths.expressToGateway('/hello/world')).toEqual('/hello/world');
    expect(paths.expressToGateway('/:hello')).toEqual('/{hello}');
    expect(paths.expressToGateway('/:hello/')).toEqual('/{hello}/');
    expect(paths.expressToGateway('/:hello/world')).toEqual('/{hello}/world');
    expect(paths.expressToGateway('/:hello/:world')).toEqual('/{hello}/{world}');
    expect(paths.expressToGateway('/:hello/world/{goodbye}')).toEqual('/{hello}/world/{goodbye}');
    expect(paths.expressToGateway('/:hello//x')).toEqual('/{hello}//x');
  });
});

describe('Paths#match', function() {
  it('should correctly match paths', function() {
    expect(paths.match('', '')).toEqual({});
    expect(paths.match('/', '/')).toEqual({});
    expect(paths.match('/hello', '/hello')).toEqual({});
    expect(paths.match('/hello/', '/hello/')).toEqual({});
    expect(paths.match('/hello/world', '/hello/world')).toEqual({});
    expect(paths.match('/:id', '/123')).toEqual({ id: '123' });
    expect(paths.match('/foo/:id', '/foo/123')).toEqual({ id: '123' });
    expect(paths.match('/foo/:id/bar', '/foo/123/bar')).toEqual({ id: '123' });
    expect(paths.match('/foo/:id/:name', '/foo/123/bar'))
        .toEqual({ id: '123', name: 'bar' });
  });

  it('should return undefined when paths do not match', function() {
    expect(paths.match('', '/')).toBeUndefined();
    expect(paths.match('/', '')).toBeUndefined();
    expect(paths.match('/foo', '/')).toBeUndefined();
    expect(paths.match('/foo', '/bar')).toBeUndefined();
    expect(paths.match('/foo/bar', '/foo/baz')).toBeUndefined();
    expect(paths.match('/foo/:id', '/bar/123')).toBeUndefined();
  });
});

describe('Paths#substitute', function() {
  it('should correctly expand paths', function() {
    expect(paths.substitute('/', {x: 'xyz'})).toEqual('/');
    expect(paths.substitute('/foo', {x: 'xyz'})).toEqual('/foo');
    expect(paths.substitute('/:x', {x: 'xyz'})).toEqual('/xyz');
    expect(paths.substitute('/foo/:x', {x: 'xyz'})).toEqual('/foo/xyz');
    expect(paths.substitute('/:x/foo', {x: 'xyz'})).toEqual('/xyz/foo');
    expect(paths.substitute('/:x/:y', {x: 'xyz'})).toEqual('/xyz/:y');
    expect(paths.substitute('/:x/:y', {x: 'xyz', y: 'abc'})).toEqual('/xyz/abc');
  });
});
