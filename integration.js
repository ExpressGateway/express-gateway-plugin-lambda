const fileType = require('file-type');

class Integration {
  constructor(req, res, requestBody, params) {
    this.req = req;
    this.res = res;
    this.requestBody = requestBody;
    this.params = params;
  }

  guessContentType(body, isBase64Encoded) {
    if (isBase64Encoded) {
      // take a best guess
      const type = fileType(Buffer.from(body, 'base64'));
      if (type && type.mime) {
        return type.mime
      } else {
        return 'application/octet-stream';
      }
    } else {
      // performance penalty on JSON.parse for large content lengths
      if (body.length > this.params.maxJSONParseLength) {
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
}

module.exports = { Integration };
