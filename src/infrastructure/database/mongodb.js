import mongoose from 'mongoose';

import { mongoUri } from '@/config/db.config.js';
import { mongoDbName, nodeEnv } from '@/config/env.config.js';
import logger from '@/common/logger/logger.js';

async function connectMongoDB() {
  if (!mongoUri) {
    logger.info('MongoDB URI not configured. Skipping database connection.');
    return null;
  }

  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(mongoUri, {
    autoIndex: nodeEnv !== 'production',
    dbName: mongoDbName,
    serverSelectionTimeoutMS: 10000,
  });

  logger.info(`MongoDB connected to database "${connection.connection.name}".`);
  return connection;
}

async function disconnectMongoDB() {
  if (mongoose.connection.readyState === 0) {
    return null;
  }

  await mongoose.disconnect();
  logger.info('MongoDB disconnected.');
  return null;
}

export { connectMongoDB, disconnectMongoDB };

export default {
  connectMongoDB,
  disconnectMongoDB,
};
