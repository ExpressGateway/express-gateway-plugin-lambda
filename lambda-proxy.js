const promisify = require('util').promisify;
const url = require('url');
const AWS = require('aws-sdk');
const getBody = promisify(require('raw-body'));
const fileType = require('file-type');

const DEFAULTS = {
  invocationType: 'RequestResponse',
  logType: 'None'
};

module.exports = params => {
  params = Object.assign({}, DEFAULTS, params);

  return (req, res) => {
    if (req._body === true) { // check if body-parser has run
      invokeLambda(req, res, req.body, params);
      return;
    }

    getBody(req).then(body => {
      invokeLambda(req, res, body, params);
    })
    .catch(err => {
      console.error(err);
      res.send(400);
    });
  };
};

function invokeLambda(req, res, body, params) {
  const lambda = new AWS.Lambda();
  const invoke = promisify(lambda.invoke.bind(lambda));

  const parts = url.parse(req.url, true);

  const isBinary = req.isBinary
    || !!fileType(body)
    || (req.headers['content-type'] && req.headers['content-type'] === 'application/octet-stream');

  const funcOpts = {
    FunctionName: params.functionName,
    Qualifier: params.qualifier,
    Payload: Buffer.from(JSON.stringify({
      httpMethod: req.method,
      queryStringParameters: parts.query,
      pathParameters: req.params,
      headers: req.headers,
      isBase64Encoded: isBinary,
      body: body.length > 0
        ? body.toString(isBinary ? 'base64' : 'utf8')
        : null
    }))
  };

  invoke(funcOpts).then(data => {
    if (data.FunctionError) {
      if (data.FunctionError === 'Unhandled') {
        console.error(JSON.parse(data.Payload).errorMessage);
        res.statusCode = params.unhandledStatus;
      } else {
        res.statusCode = data.StatusCode;
      }

      res.end();
      return;
    }

    const output = JSON.parse(data.Payload);
    res.statusCode = output.statusCode || 200;

    let contentType;

    for (name in output.headers) {
      if (name.toLowerCase() === 'content-type') {
        contentType = output.headers[name];
      }

      res.setHeader(name, output.headers[name]);
    }

    if (!contentType) {
      // take a best guess
      const type = fileType(output.body);
      if (output.isBase64Encoded && type && type.mime) {
        res.setHeader('Content-Type', type.mime);
      } else if (!output.isBase64Encoded) {
        // performance penalty on JSON.parse for large content lengths
        if (output.body.length > (5 * 1.049e+6) /* 5MiB */) {
          res.setHeader('Content-Type', 'text/plain');
        } else {
          try {
            const _ = JSON.parse(output.body.toString());
            res.setHeader('Content-Type', 'application/json');
          } catch (_) {
            res.setHeader('Content-Type', 'text/plain');
          }
        }
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
    }

    const body = output.isBase64Encoded
      ? Buffer.from(output.body, 'base64')
      : output.body;

    res.end(body);
  })
  .catch(ex => {
    console.error(ex);
  });
}
