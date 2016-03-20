var expect = require('chai').expect;
var paths = require('../../lib/internal/paths');


describe('Paths#gatewayToExpress', function() {
  it('should convert API gateway paths to express paths', function() {
    expect(paths.gatewayToExpress()).to.be.undefined;
    expect(paths.gatewayToExpress('')).to.equal('');
    expect(paths.gatewayToExpress('/')).to.equal('/');
    expect(paths.gatewayToExpress('/hello')).to.equal('/hello');
    expect(paths.gatewayToExpress('/hello/world')).to.equal('/hello/world');
    expect(paths.gatewayToExpress('/{hello}')).to.equal('/:hello');
    expect(paths.gatewayToExpress('/{hello}/')).to.equal('/:hello/');
    expect(paths.gatewayToExpress('/{hello}/world')).to.equal('/:hello/world');
    expect(paths.gatewayToExpress('/{hello}/{world}')).to.equal('/:hello/:world');
    expect(paths.gatewayToExpress('/{hello}/world/{goodbye}')).to.equal('/:hello/world/:goodbye');
    expect(paths.gatewayToExpress('/{hello}//x')).to.equal('/:hello//x');
  });
});

describe('Paths#expressToGateway', function() {
  it('should convert express paths to API gateway paths', function() {
    expect(paths.expressToGateway()).to.be.undefined;
    expect(paths.expressToGateway('')).to.equal('');
    expect(paths.expressToGateway('/')).to.equal('/');
    expect(paths.expressToGateway('/hello')).to.equal('/hello');
    expect(paths.expressToGateway('/hello/world')).to.equal('/hello/world');
    expect(paths.expressToGateway('/:hello')).to.equal('/{hello}');
    expect(paths.expressToGateway('/:hello/')).to.equal('/{hello}/');
    expect(paths.expressToGateway('/:hello/world')).to.equal('/{hello}/world');
    expect(paths.expressToGateway('/:hello/:world')).to.equal('/{hello}/{world}');
    expect(paths.expressToGateway('/:hello/world/{goodbye}')).to.equal('/{hello}/world/{goodbye}');
    expect(paths.expressToGateway('/:hello//x')).to.equal('/{hello}//x');
  });
});

describe('Paths#matchPath', function() {
  it('should correctly match paths', function() {
    expect(paths.matchPath('', '')).to.deep.equal({});
    expect(paths.matchPath('/', '/')).to.deep.equal({});
    expect(paths.matchPath('/hello', '/hello')).to.deep.equal({});
    expect(paths.matchPath('/hello/', '/hello/')).to.deep.equal({});
    expect(paths.matchPath('/hello/world', '/hello/world')).to.deep.equal({});
    expect(paths.matchPath('/:id', '/123')).to.deep.equal({ id: '123' });
    expect(paths.matchPath('/foo/:id', '/foo/123')).to.deep.equal({ id: '123' });
    expect(paths.matchPath('/foo/:id/bar', '/foo/123/bar')).to.deep.equal({ id: '123' });
    expect(paths.matchPath('/foo/:id/:name', '/foo/123/bar'))
        .to.deep.equal({ id: '123', name: 'bar' });
  });

  it('should return undefined when paths do not match', function() {
    expect(paths.matchPath('', '/')).to.be.undefined;
    expect(paths.matchPath('/', '')).to.be.undefined;
    expect(paths.matchPath('/foo', '/')).to.be.undefined;
    expect(paths.matchPath('/foo', '/bar')).to.be.undefined;
    expect(paths.matchPath('/foo/bar', '/foo/baz')).to.be.undefined;
    expect(paths.matchPath('/foo/:id', '/bar/123')).to.be.undefined;
  });
});
