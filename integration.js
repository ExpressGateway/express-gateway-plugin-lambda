const promisify = require('util').promisify;
const AWS = require('aws-sdk');
const debug = require('debug')('express-gateway-plugin-lambda:integration');
const fileType = require('file-type');

class Integration {
  constructor({ req, res, requestBody, settings }) {
    this.req = req;
    this.res = res;
    this.requestBody = requestBody;
    this.settings = settings;
  }

  guessContentType(body, isBase64Encoded) {
    if (isBase64Encoded) {
      const type = fileType(Buffer.from(body, 'base64'));
      if (type && type.mime) {
        return type.mime
      } else {
        return 'application/octet-stream';
      }
    } else {
      // performance penalty on JSON.parse for large content lengths
      if (body.length > this.settings.maxJSONParseLength) {
        return 'text/plain';
      } else {
        try {
          const _ = JSON.parse(body.toString());
          return 'application/json';
        } catch (_) {
          return 'text/plain';
        }
      }
    }
  }

  invoke() {
    const lambda = new AWS.Lambda();
    const invoke = promisify(lambda.invoke.bind(lambda));

    const settings = this.settings;
    const res = this.res;

    const functionOptions = this.build();

    return invoke(functionOptions).then(data => {
      if (data.FunctionError) {
        if (data.FunctionError === 'Unhandled') {
          res.statusCode = settings.unhandledStatus;
        } else {
          res.statusCode = data.StatusCode;
        }

        debug(`Failed to execute Lambda function (${data.FunctionError}):`,
          JSON.parse(data.Payload).errorMessage);

        res.end();
        return;
      }

      this.respond(JSON.parse(data.Payload));
    })
    .catch(ex => {
      debug(ex);
      this.res.sendStatus(500);
    });
  }
}

module.exports = { Integration };
