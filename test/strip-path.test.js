const assert = require('assert');
const path = require('path');
const axios = require('axios').default;
const awsMock = require('aws-sdk-mock');
const gateway = require('express-gateway');

const { prepare } = require('./helpers');

const CONFIG_PATH = path.join(__dirname, './fixtures/strip-path/config');

describe('lambda-proxy policy : strip path', () => {
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
      })
      .catch(err => {
        console.error(err);
      });
  });

  beforeEach(() => {
    awsMock.restore();
  });

  it('strips the API Endpoint prefix from the path', () => {
    let requestPayload;

    awsMock.mock('Lambda', 'invoke', (params, callback) => {
      requestPayload = JSON.parse(params.Payload);

      callback(null, {
        Payload: JSON.stringify({
          statusCode: 200,
          body: 'Hello World'
        })
      });
    });

    return axiosInstance
      .get('/api/v1/world')
      .then(res => {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(requestPayload.path, '/world');
      });
  });

  after(done => {
    app.close(() => done());
  });
});

