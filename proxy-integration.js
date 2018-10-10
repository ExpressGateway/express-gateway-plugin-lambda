const url = require('url');
const fileType = require('file-type');

class ProxyIntegration {
  constructor(req, res, requestBody, params) {
    this.req = req;
    this.res = res;
    this.requestBody = requestBody;
    this.params = params;
  }

  prepare() {
    const req = this.req;
    const body = this.requestBody;
    const params = this.params;

    const isBinary = req.isBinary
      || !!fileType(body)
      || (req.headers['content-type'] && req.headers['content-type'] === 'application/octet-stream');

    req.egContext.lambda = Object.assign({},
      req.egContext.lambda || {},
      {
        apiEndpoint: req.egContext.apiEndpoint,
        resourcePath: req.route.path,
        httpMethod: req.method,
        requestId: req.egContext.requestID
      });

    let requestPath = req.url;

    if (params.stripPath) {
      requestPath =
        `/${req.params[0] || ''}${req._parsedUrl.search || ''}`;
    }

    if (params.ignorePath) {
      requestPath = '/';
    }

    return {
      FunctionName: params.functionName,
      Qualifier: params.qualifier,
      Payload: Buffer.from(JSON.stringify({
        httpMethod: req.method,
        path: requestPath,
        resource: req.route.path,
        queryStringParameters: url.parse(req.url, true).query,
        pathParameters: req.params,
        headers: req.headers,
        requestContext: req.egContext.lambda,
        isBase64Encoded: isBinary,
        body: body.length > 0
          ? body.toString(isBinary ? 'base64' : 'utf8')
          : null
      }))
    };
  }

  respond(payload) {
    const { statusCode,
            headers,
            body,
            isBase64Encoded } = payload;

    const res = this.res;

    res.statusCode = statusCode || 200;

    let contentType;

    for (const name in headers) {
      if (name.toLowerCase() === 'content-type') {
        contentType = headers[name];
      }

      res.setHeader(name, headers[name]);
    }

    if (!contentType) {
      if (isBase64Encoded) {
        // take a best guess
        const type = fileType(Buffer.from(body, 'base64'));
        if (type && type.mime) {
          res.setHeader('Content-Type', type.mime);
        } else {
          res.setHeader('Content-Type', 'application/octet-stream');
        }
      } else {
        // performance penalty on JSON.parse for large content lengths
        if (body.length > (5 * 1.049e+6) /* 5MiB */) {
          res.setHeader('Content-Type', 'text/plain');
        } else {
          try {
            const _ = JSON.parse(body.toString());
            res.setHeader('Content-Type', 'application/json');
          } catch (_) {
            res.setHeader('Content-Type', 'text/plain');
          }
        }
      }
    }

    res.end(isBase64Encoded ? Buffer.from(body, 'base64') : body);
  }
}

module.exports = ProxyIntegration;
