const path = require('path');

const prepare = (configPath) => {
  const config = require('express-gateway/lib/config');
  config.gatewayConfigPath = path.join(configPath, 'gateway.config.yml');
  config.loadConfig('gateway');
  config.systemConfigPath = path.join(configPath, 'system.config.yml');
  config.loadConfig('system');

  disableConfigWatchers();
  silenceLoggers();
}

const disableConfigWatchers = () => {
  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    process.env.EG_DISABLE_CONFIG_WATCH = true;
  }
};

const silenceLoggers = () => {
  const logger = require('express-gateway/lib/logger');

  for (const name of Object.keys(logger)) {
    if (typeof logger[name] !== 'object') {
      continue;
    }

    logger[name].silent = true;
  }
};

module.exports = { prepare, disableConfigWatchers, silenceLoggers };
