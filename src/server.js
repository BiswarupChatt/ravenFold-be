import app from '@/app.js';
import { nodeEnv, port } from '@/config/env.config.js';
import logger from '@/common/logger/logger.js';
import { connectMongoDB, disconnectMongoDB } from '@/infrastructure/database/mongodb.js';
import { connectRedis, disconnectRedis } from '@/infrastructure/redis/redis.js';

const startServer = async () => {
  await connectMongoDB();
  await connectRedis();

  const server = app.listen(port, () => {
    logger.info(`Server running in ${nodeEnv} mode on port ${port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received. Closing server.`);

    server.close(async () => {
      await disconnectRedis();
      await disconnectMongoDB();
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
