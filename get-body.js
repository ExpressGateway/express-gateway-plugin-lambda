const promisify = require('util').promisify;
const debug = require('debug')('express-gateway-plugin-lambda:get-body');
const getRawBody = promisify(require('raw-body'));

const getBody = (req, res) => {
  if (req._body === true) { // check if body-parser middleware has run
    return Promise.resolve(req.body);
  } else {
    return getRawBody(req).catch(err => {
      debug('Failed to receive request body:', err);
      res.sendStatus(400);
    });
  }
}

module.exports = { getBody };
