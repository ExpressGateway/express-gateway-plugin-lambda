const assert = require('assert');
const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const awsMock = require('aws-sdk-mock');
const gateway = require('express-gateway');

const { prepare } = require('./helpers');

const CONFIG_PATH = path.join(__dirname, './fixtures/basic/config');

describe('lambda-proxy policy : basic', () => {
  let app, axiosInstance;

  before(done => {
    prepare(CONFIG_PATH);

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
    require('express-gateway/lib/config').loadConfig('gateway');
    awsMock.restore();
  });

  it('returns a custom status code on Unhandled error', () => {
    awsMock.mock('Lambda', 'invoke', {
      FunctionError: 'Unhandled',
      Payload: JSON.stringify({
        errorMessage: 'test error'
      })
    });

    return axiosInstance
      .get('/world')
      .catch(err => {
        assert.strictEqual(err.response.status, 503);
      });
  });

  describe('with proxy integration enabled', () => {
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
        .get('/world')
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
        .get('/world')
        .then(res => {
          assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
          assert.strictEqual(res.data, 'Hello World');
        });
    });

    it('includes a path', () => {
      let requestPayload;

      awsMock.mock('Lambda', 'invoke', (params, callback) => {
        requestPayload = JSON.parse(params.Payload);

        callback(null, {
          Payload: JSON.stringify({
            statusCode: 200,
            body: ''
          })
        });
      });

      return axiosInstance
        .get('/world')
        .then(res => {
          assert.strictEqual(res.status, 200);
          assert.strictEqual(requestPayload.path, '/world');
        });
    });

    it('includes a request context', () => {
      let requestPayload;

      awsMock.mock('Lambda', 'invoke', (params, callback) => {
        requestPayload = JSON.parse(params.Payload);

        callback(null, {
          Payload: JSON.stringify({
            statusCode: 200,
            body: ''
          })
        });
      });

      return axiosInstance
        .get('/world')
        .then(res => {
          assert.strictEqual(res.status, 200);
          assert(requestPayload.requestContext);

          const requestContext = requestPayload.requestContext;

          assert(requestContext.apiEndpoint);
          assert.strictEqual(requestContext.apiEndpoint.apiEndpointName, 'default');
        });
    });

    describe('takes a best guess at content-type', () => {
      it('known binary', () => {
        const imagePath = path.join(__dirname, '/fixtures/assets/eg-favicon.png');
        const image = fs.readFileSync(imagePath);

        awsMock.mock('Lambda', 'invoke', {
          Payload: JSON.stringify({
            statusCode: 200,
            body: image.toString('base64'),
            isBase64Encoded: true
          })
        });

        return axiosInstance
          .get('/world')
          .then(res => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers['content-type'], 'image/png');
          });
      });

      it('plaintext', () => {
        awsMock.mock('Lambda', 'invoke', {
          Payload: JSON.stringify({
            statusCode: 200,
            body: 'Hello World',
          })
        });

        return axiosInstance
          .get('/world')
          .then(res => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers['content-type'], 'text/plain');
          });
      });

      it('JSON', () => {
        awsMock.mock('Lambda', 'invoke', {
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({ hello: 'world' }),
          })
        });

        return axiosInstance
          .get('/world')
          .then(res => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers['content-type'], 'application/json');
          });
      });

      it('unknown binary', () => {
        awsMock.mock('Lambda', 'invoke', {
          Payload: JSON.stringify({
            statusCode: 200,
            body: Buffer.alloc(16, 3).toString('base64'),
            isBase64Encoded: true
          })
        });

        return axiosInstance
          .get('/world')
          .then(res => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
          });
      });
    });
  });

  after(done => {
    app.close(() => done());
  });
});
