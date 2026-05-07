import { mongoUri } from '@/config/db.config.js';
import logger from '@/common/logger/logger.js';

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

export { connectMongoDB, disconnectMongoDB };

export default {
  connectMongoDB,
  disconnectMongoDB,
};