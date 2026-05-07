const { redisUrl } = require('../../config/redis.config');
const logger = require('../../common/logger/logger');

async function connectRedis() {
  if (!redisUrl) {
    logger.info('Redis URL not configured. Skipping Redis connection.');
    return null;
  }

  logger.info('Redis connection placeholder ready.');
  return null;
}

async function disconnectRedis() {
  return null;
}

module.exports = {
  connectRedis,
  disconnectRedis,
};
