import { redisUrl } from '@/config/redis.config.js';
import logger from '@/common/logger/logger.js';

const connectRedis = async () => {
  if (!redisUrl) {
    logger.info('Redis URL not configured. Skipping Redis connection.');
    return null;
  }

  logger.info('Redis connection placeholder ready.');
  return null;
};

const disconnectRedis = async () => {
  return null;
};

export { connectRedis, disconnectRedis };

export default {
  connectRedis,
  disconnectRedis,
};
