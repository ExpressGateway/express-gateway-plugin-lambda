const lambdaProxy = require('./lambda-proxy');
const schemas = require('./schemas');

module.exports = {
  version: '1.0.0',
  policies: ['lambda-proxy'],
  init: pluginContext => {
    pluginContext.registerPolicy({
      name: 'lambda-proxy',
      policy: lambdaProxy(pluginContext.settings),
      schema: schemas.policy
    });
  },
  schema: schemas.plugin
};
