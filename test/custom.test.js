const assert = require('assert');
const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const awsMock = require('aws-sdk-mock');
const gateway = require('express-gateway');

const { prepare } = require('./helpers');

const CONFIG_PATH = path.join(__dirname, './fixtures/custom/config');

describe('lambda-proxy policy : custom', () => {
  let app, axiosInstance;

  before(done => {
    prepare(CONFIG_PATH);

    gateway()
      .run()
      .then(([server]) => {
        app = server.app;

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

  it('returns a default response when the lambda context is missing', () => {
    awsMock.mock('Lambda', 'invoke', {
      Payload: JSON.stringify({
        hello: 'world'
      })
    });

    return axiosInstance
      .get('/world')
      .then(res => {
        assert.strictEqual(res.headers['content-type'], 'application/json');
        assert.deepStrictEqual(res.data, { hello: 'world' });
      });
  });

  after(done => {
    app.close(() => done());
  });
});
