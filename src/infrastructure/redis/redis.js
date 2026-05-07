import { redisUrl } from '@/config/redis.config.js';
import logger from '@/common/logger/logger.js';

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

export { connectRedis, disconnectRedis };

export default {
  connectRedis,
  disconnectRedis,
};