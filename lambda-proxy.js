const promisify = require('util').promisify;
const url = require('url');
const AWS = require('aws-sdk');
const debug = require('debug')('express-gateway-plugin-lambda:lambda-proxy');
const getBody = promisify(require('raw-body'));
const fileType = require('file-type');

const DEFAULTS = {
  invocationType: 'RequestResponse',
  logType: 'None',
  unhandledStatus: 500,
  ignorePath: false,
  stripPath: false
};

module.exports = function lambdaProxy(pluginSettings) {
  return policyParams => {
    policyParams = Object.assign({}, DEFAULTS, pluginSettings, policyParams);

    return (req, res) => {
      let params = Object.assign({}, policyParams);

      req.egContext.lambda = Object.assign({},
        req.egContext.lambda || {},
        {
          apiEndpoint: req.egContext.apiEndpoint
        });

      params.path = req.url;

      if (params.stripPath) {
        params.path =
          `/${req.params[0] || ''}${req._parsedUrl.search || ''}`;
      }

      if (params.ignorePath) {
        params.path = '/';
      }

      if (req._body === true) { // check if body-parser has run
        invokeLambda(req, res, req.body, params);
        return;
      }

      getBody(req).then(body => {
        invokeLambda(req, res, body, params);
      })
      .catch(err => {
        debug('Failed to receive request body:', err);
        res.send(400);
      });
    };
  };
};

function invokeLambda(req, res, body, params) {
  const lambda = new AWS.Lambda();
  const invoke = promisify(lambda.invoke.bind(lambda));

  const funcOpts = prepareRequestWithProxyIntegration(req, body, params);

  invoke(funcOpts).then(data => {
    if (data.FunctionError) {
      if (data.FunctionError === 'Unhandled') {
        res.statusCode = params.unhandledStatus;
      } else {
        res.statusCode = data.StatusCode;
      }

      debug(`Failed to execute Lambda function (${data.FunctionError}):`,
        JSON.parse(data.Payload).errorMessage);

      res.end();
      return;
    }

    respondWithProxyIntegration(res, JSON.parse(data.Payload));

  })
  .catch(ex => {
    debug(ex);
  });
}

function prepareRequestWithProxyIntegration(req, body, params) {
  const isBinary = req.isBinary
    || !!fileType(body)
    || (req.headers['content-type'] && req.headers['content-type'] === 'application/octet-stream');

  return {
    FunctionName: params.functionName,
    Qualifier: params.qualifier,
    Payload: Buffer.from(JSON.stringify({
      httpMethod: req.method,
      path: params.path,
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

function respondWithProxyIntegration(res, payload) {
  const { statusCode,
          headers,
          body,
          isBase64Encoded } = payload;

  res.statusCode = statusCode || 200;

  let contentType;

  for (name in headers) {
    if (name.toLowerCase() === 'content-type') {
      contentType = headers[name];
    }

    res.setHeader(name, headers[name]);
  }

  if (!contentType) {
    // take a best guess
    const type = fileType(body);
    if (isBase64Encoded && type && type.mime) {
      res.setHeader('Content-Type', type.mime);
    } else if (!isBase64Encoded) {
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
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
  }

  res.end(isBase64Encoded ? Buffer.from(body, 'base64') : body);
}
