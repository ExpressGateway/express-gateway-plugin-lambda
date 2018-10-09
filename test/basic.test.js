const assert = require('assert');
const path = require('path');
const axios = require('axios').default;
const awsMock = require('aws-sdk-mock');
const gateway = require('express-gateway');

const CONFIG_PATH = path.join(__dirname, './fixtures/basic/config');

describe('Lambda Proxy Integration', () => {
  let app, axiosInstance;

  before(done => {
    disableExpressGatewayConfigWatchers();
    silenceExpressGatewayLoggers();

    gateway()
      .load(CONFIG_PATH)
      .run()
      .then(servers => {
        app = servers[0].app;

        const port = app.address().port;
        axiosInstance = axios.create({
          baseURL: `http://localhost:${port}`,
          validateStatus: status => status < 400
        });

        done();
      });
  });

  beforeEach(() => {
    awsMock.restore();
  });

  it('translates Lambda function output to an HTTP response', () => {
    awsMock.mock('Lambda', 'invoke', {
      Payload: JSON.stringify({
        statusCode: 200,
        headers: {
          'Custom': 'Success'
        },
        body: JSON.stringify({
          hello: 'world'
        })
      })
    });

    return axiosInstance
      .get('/')
      .then(res => {
        assert.strictEqual(res.headers['content-type'], 'application/json');
        assert.strictEqual(res.headers['custom'], 'Success');
        assert.deepStrictEqual(res.data, { hello: 'world' });
      });
  });

  it('supports base64-encoded response bodies', () => {
    awsMock.mock('Lambda', 'invoke', {
      Payload: JSON.stringify({
        statusCode: 200,
        body: 'SGVsbG8gV29ybGQ=',
        isBase64Encoded: true
      })
    });

    return axiosInstance
      .get('/')
      .then(res => {
        assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
        assert.strictEqual(res.data, 'Hello World');
      });
  });

  it('returns a custom status code on Unhandled error', () => {
    awsMock.mock('Lambda', 'invoke', {
      FunctionError: 'Unhandled',
      Payload: JSON.stringify({
        errorMessage: 'test error'
      })
    });

    return axiosInstance
      .get('/')
      .catch(err => {
        assert.strictEqual(err.response.status, 500);
      });
  });

  after(done => {
    app.close(() => done());
  });
});

function disableExpressGatewayConfigWatchers() {
  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    process.env.EG_DISABLE_CONFIG_WATCH = true;
  }
}

function silenceExpressGatewayLoggers() {
  const logger = require('express-gateway/lib/logger');

  for (const name in logger) {
    if (typeof logger[name] !== 'object') {
      continue;
    }

    logger[name].silent = true;
  }
}
