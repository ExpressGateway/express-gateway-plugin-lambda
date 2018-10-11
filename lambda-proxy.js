const { CustomIntegration } = require('./custom-integration');
const { ProxyIntegration } = require('./proxy-integration');

const { createSettings } = require('./create-settings');
const { getBody } = require('./get-body');

module.exports = pluginSettings => {
  return policyParams => {
    const settings = createSettings(pluginSettings, policyParams);

    const Integration = settings.useCustomIntegration
      ? CustomIntegration : ProxyIntegration

    return (req, res) => {
      getBody(req, res).then(requestBody => {
        const options = {
          req,
          res,
          requestBody,
          settings
        }

        Integration.invoke(options);
      });
    };
  };
};
