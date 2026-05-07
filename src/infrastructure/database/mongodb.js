const { mongoUri } = require('../../config/db.config');
const logger = require('../../common/logger/logger');

async function connectMongoDB() {
  if (!mongoUri) {
    logger.info('MongoDB URI not configured. Skipping database connection.');
    return null;
  }

  logger.info('MongoDB connection placeholder ready.');
  return null;
}

async function disconnectMongoDB() {
  return null;
}

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
};
