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
  const url = new URL(`https://localhost${request.url}`);
  let context = {
    'invokedFunctionArn': 'arn:aws:lambda:::::' + args.environment
  };
  let pathname = url.pathname;
  if (pathname === '/') {
    pathname = '/index';
  }
  if (args.path !== null) {
    pathname = `/${args.path}${pathname}`;
  }
  let route = findRoute(app, 'GET', pathname);
  if (route) {
    let params = paths.match(route.path, pathname);
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      let req = new Request({
        app: app,
        environment: args.environment,
        lambdaArn: 'arn:aws:lambda:::::' + args.environment,
        method: request.method,
        path: pathname,
        headers: request.headers,
        params: params,
        query: url.searchParams,
        body: body,
        apiGateway: true
      });
      app._handleRequest(req, (err, data) => {
        if (err) {
          console.log(err);
          response.statusCode = 500;
          response.end(err);
        } else {
          const headers = Object.assign({'Content-Type': 'application/json'}, data.headers);
          response.writeHead(data.statusCode, headers);
          response.end(data.body);
        }
      });
    });
  } else {
    response.end('Route not found');
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