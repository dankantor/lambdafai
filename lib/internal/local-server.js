const http = require('http');
const URL = require('url').URL;
const _ = require('lodash');
const path = require('path');
const paths = require('../internal/paths');
const Request = require('../api/request');

let app;
let args;
let callback;

const findRoute = (app, method, path) => {
  return _.find(_.flatten(_.map(app.lambdas, 'handlers')), function(h) {
    return h.type == 'route' && h.method == method && paths.match(h.path, path);
  });
};

const requestHandler = (request, response) => {
  try {
    const url = new URL(`https://localhost${request.url}`);
    let context = {
      'invokedFunctionArn': 'arn:aws:lambda:::::' + args.environment
    };
    let pathname = url.pathname;
    if (pathname === '/') {
      pathname = '/index';
    }
    if (args.path !== null) {
      if (args.pathoverride === null) {
        pathname = `/${args.path}${pathname}`;
      } else {
        let pathOverrides = args.pathoverride.split(',');
        let found = pathOverrides.find(pathOverride => {
          if (pathname.indexOf(pathOverride) === 1) {
            return true;
          }
        });
        if (found === undefined) {
          pathname = `/${args.path}${pathname}`;
        }
      }
    }
    let route = findRoute(app, 'GET', pathname);
    if (route) {
      let params = paths.match(route.path, pathname);
      let body = [];
      let query = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });
      request.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        let requestContentType = request.headers['content-type'] || request.headers['Content-Type'];
        if (requestContentType !== undefined) {
          switch(requestContentType) {
            case 'application/javascript':
              body = JSON.parse(body);
              break;
            case 'application/json':
              body = JSON.parse(body);
              break;
            case 'application/x-www-form-urlencoded': 
              let bodyQuery = {};
              const bodyParams = new URL(`https://localhost/foo?${event.body}`);
              bodyParams.searchParams.forEach((value, key) => {
                bodyQuery[key] = value;
              });
              body = bodyQuery;
            break;
            default:
              break;
          }
        }
        let req = new Request({
          app: app,
          environment: args.environment,
          lambdaArn: 'arn:aws:lambda:::::' + args.environment,
          method: request.method,
          path: pathname,
          headers: request.headers,
          params: params,
          query: query,
          body: body,
          apiGateway: true,
          isLocalhost: true
        });
        app._handleRequest(req, (err, data) => {
          if (err) {
            console.log(err);
            response.statusCode = 500;
            response.end(err);
          } else {
            let headerKeys = Object.keys(data.headers);
            headerKeys.forEach(headerKey => {
              response.setHeader(headerKey, data.headers[headerKey]);
            });
            if (response.getHeader('content-type') === undefined) {
              response.setHeader('content-type', 'application/json');
            }
            response.statusCode = data.statusCode;
            response.end(data.body);
          }
        });
      });
    } else {
      response.end('Route not found');
    }
  } catch (err) {
    response.end(err);
  }
};

const listen = (_app, _args, _callback) => {
  app = _app;
  args = _args;
  callback = _callback;
  const server = http.createServer(requestHandler);
  server.listen(args.port, (err) => {
    if (err) {
      return console.log('something bad happened', err);
    }
    console.log(`server is listening on ${args.port}`);
  });
};

module.exports = {
  'listen': listen
};