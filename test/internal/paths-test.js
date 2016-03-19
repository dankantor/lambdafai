var expect = require('chai').expect;
var paths = require('../../lib/internal/paths');


describe('#gatewayToExpress', function() {
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

describe('#expressToGateway', function() {
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
