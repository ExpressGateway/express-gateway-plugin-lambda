const DEFAULTS = Object.freeze({
  invocationType: 'RequestResponse',
  logType: 'None',
  unhandledStatus: 500,
  useCustomIntegration: false,
  ignorePath: false,
  stripPath: false,
  maxJSONParseLength: (5 * 1.049e+6) // 5MiB
});

const createSettings = (...settings) => {
  return Object.assign({}, DEFAULTS, ...settings);
};

module.exports = { createSettings };
