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

describe('Paths#matchPath', function() {
  it('should correctly match paths', function() {
    expect(paths.matchPath('', '')).toEqual({});
    expect(paths.matchPath('/', '/')).toEqual({});
    expect(paths.matchPath('/hello', '/hello')).toEqual({});
    expect(paths.matchPath('/hello/', '/hello/')).toEqual({});
    expect(paths.matchPath('/hello/world', '/hello/world')).toEqual({});
    expect(paths.matchPath('/:id', '/123')).toEqual({ id: '123' });
    expect(paths.matchPath('/foo/:id', '/foo/123')).toEqual({ id: '123' });
    expect(paths.matchPath('/foo/:id/bar', '/foo/123/bar')).toEqual({ id: '123' });
    expect(paths.matchPath('/foo/:id/:name', '/foo/123/bar'))
        .toEqual({ id: '123', name: 'bar' });
  });

  it('should return undefined when paths do not match', function() {
    expect(paths.matchPath('', '/')).toBeUndefined();
    expect(paths.matchPath('/', '')).toBeUndefined();
    expect(paths.matchPath('/foo', '/')).toBeUndefined();
    expect(paths.matchPath('/foo', '/bar')).toBeUndefined();
    expect(paths.matchPath('/foo/bar', '/foo/baz')).toBeUndefined();
    expect(paths.matchPath('/foo/:id', '/bar/123')).toBeUndefined();
  });
});
