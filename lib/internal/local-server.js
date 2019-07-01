const http = require('http');
const URL = require('url').URL;
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
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

const serveStatic = (filePath, request, response) => {
  fs.createReadStream(filePath).pipe(response);
}

const requestHandler = (request, response) => {
  try {
    const url = new URL(`https://localhost${request.url}`);
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
    let route = findRoute(app, request.method, pathname);
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
        let even = true;
        let reqHeaders = {};
        request.rawHeaders.forEach((header, i) => {
          if (even === true) {
            reqHeaders[header] = request.rawHeaders[i + 1];
            even = false;
          } else {
            even = true;
          }
        });
        let req = new Request({
          app: app,
          environment: args.environment,
          lambdaArn: 'arn:aws:lambda:::::' + args.environment,
          method: request.method,
          path: pathname,
          headers: reqHeaders,
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
            let contentType = data.headers['Content-Type'] || data.headers['content-type'] || 'application/json';
            response.setHeader('content-type', contentType);
            response.writeHead(data.statusCode, data.headers);
            response.end(data.body);
          }
        });
      });
    } else {
      if (args.static) {
        let filePath = `${process.cwd()}/${args.static}${pathname}`;
        fs.exists(filePath, exists => {
          if (exists === true) {
            serveStatic(filePath, request, response);
          } else {
            if (args.staticfallback) {
              serveStatic(`${process.cwd()}/${args.static}/${args.staticfallback}`, request, response);
            }
          }
        });
      } else {
        response.statusCode = 404;
        response.end('Route not found');
      }
    }
  } catch (err) {
    console.log(err);
    response.statusCode = 500;
    response.end(err.message);
  }
}

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