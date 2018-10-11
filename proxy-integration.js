const url = require('url');
const fileType = require('file-type');
const { Integration } = require('./integration');

class ProxyIntegration extends Integration {
  build() {
    const req = this.req;
    const body = this.requestBody;
    const settings = this.settings;

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

    if (settings.stripPath) {
      requestPath =
        `/${req.params[0] || ''}${req._parsedUrl.search || ''}`;
    }

    if (settings.ignorePath) {
      requestPath = '/';
    }

    return {
      FunctionName: settings.functionName,
      Qualifier: settings.qualifier,
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

  static invoke(options) {
    const integration = new ProxyIntegration(options);
    return integration.invoke();
  }
}

module.exports = { ProxyIntegration };
