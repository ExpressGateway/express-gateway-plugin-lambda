const { Integration } = require('./integration');

class CustomIntegration  extends Integration {
  build() {
    const payload = this.req.egContext.lambda
      || this.defaultRequestPayload;
    
    return {
      FunctionName: this.settings.functionName,
      Qualifier: this.settings.qualifier,
      Payload: Buffer.from(JSON.stringify(payload))
    };
  }

  respond(payload) {
    this.res.statusCode = 200;
    this.res.setHeader('Content-Type', this.guessContentType(payload));
    this.res.end(payload);
  }

  get defaultRequestPayload() {
    return {
      method: this.req.method,
      path: this.req.url,
      headers: this.req.headers,
      body: this.requestBody.toString(this.isBinaryRequestBody ? 'base64' : 'utf8')
    }
  }

  static invoke(options) {
    const integration = new CustomIntegration(options);
    return integration.invoke();
  }
}

module.exports = { CustomIntegration };
