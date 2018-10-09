exports.disableExpressGatewayConfigWatchers = () => {
  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    process.env.EG_DISABLE_CONFIG_WATCH = true;
  }
};

exports.silenceExpressGatewayLoggers = () => {
  const logger = require('express-gateway/lib/logger');

  for (const name in logger) {
    if (typeof logger[name] !== 'object') {
      continue;
    }

    logger[name].silent = true;
  }
};
