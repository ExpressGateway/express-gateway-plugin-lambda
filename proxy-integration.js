const url = require('url');
const fileType = require('file-type');
const { Integration } = require('./integration');

class ProxyIntegration extends Integration {
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
      res.setHeader('Content-Type', this.guessContentType(body, isBase64Encoded));
    }

    res.end(isBase64Encoded ? Buffer.from(body, 'base64') : body);
  }
}

module.exports = { ProxyIntegration };
