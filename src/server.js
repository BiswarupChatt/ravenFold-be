const app = require('./app');
const { nodeEnv, port } = require('./config/env.config');
const logger = require('./common/logger/logger');
const { connectMongoDB, disconnectMongoDB } = require('./infrastructure/database/mongodb');
const { connectRedis, disconnectRedis } = require('./infrastructure/redis/redis');

async function startServer() {
  await connectMongoDB();
  await connectRedis();

  const server = app.listen(port, () => {
    logger.info(`Server running in ${nodeEnv} mode on port ${port}`);
  });

  async function shutdown(signal) {
    logger.info(`${signal} received. Closing server.`);

    server.close(async () => {
      await disconnectRedis();
      await disconnectMongoDB();
      logger.info('Server closed.');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
