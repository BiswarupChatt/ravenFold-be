const morgan = require('morgan');
const { nodeEnv } = require('../../config/env.config');

module.exports = morgan(nodeEnv === 'production' ? 'combined' : 'dev');
