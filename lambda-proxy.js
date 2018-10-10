const promisify = require('util').promisify;
const AWS = require('aws-sdk');
const debug = require('debug')('express-gateway-plugin-lambda:lambda-proxy');
const getBody = promisify(require('raw-body'));
const ProxyIntegration = require('./proxy-integration');

const DEFAULTS = {
  invocationType: 'RequestResponse',
  logType: 'None',
  unhandledStatus: 500,
  useCustomIntegration: false,
  ignorePath: false,
  stripPath: false,
  maxJSONParseLength: (5 * 1.049e+6) // 5MiB
};

module.exports = function lambdaProxy(pluginSettings) {
  return policyParams => {
    policyParams = Object.assign({}, DEFAULTS, pluginSettings, policyParams);

    return (req, res) => {

      if (req._body === true) { // check if body-parser has run
        invokeLambda(req, res, req.body, policyParams);
        return;
      }

      getBody(req).then(body => {
        invokeLambda(req, res, body, policyParams);
      })
      .catch(err => {
        debug('Failed to receive request body:', err);
        res.sendStatus(400);
      });
    };
  };
};

function invokeLambda(req, res, body, params) {
  const lambda = new AWS.Lambda();
  const invoke = promisify(lambda.invoke.bind(lambda));

  //const Handler = params.useCustomIntegration ? CustomIntegration : ProxyIntegration;
  //const handler = new Handler(req, res, body, params);
  const handler = new ProxyIntegration(req, res, body, params);

  const funcOpts = handler.prepare();

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

    handler.respond(JSON.parse(data.Payload));
  })
  .catch(ex => {
    debug(ex);
  });
}
