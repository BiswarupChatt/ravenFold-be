require('dotenv').config({ quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api',
  frontendUrl: process.env.FRONTEND_URL || '*',
  mongoUri: process.env.MONGO_URI || '',
  mongoDbName: process.env.MONGO_DB_NAME || 'ravenfold',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

module.exports = env;
