import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const nodeEnv = process.env.NODE_ENV || 'development';
export const port = Number(process.env.PORT) || 3000;
export const apiPrefix = process.env.API_PREFIX || '/api';
export const frontendUrl = process.env.FRONTEND_URL || '*';
export const mongoUri = process.env.MONGO_URI || '';
export const mongoDbName = process.env.MONGO_DB_NAME || 'ravenfold';
export const redisUrl = process.env.REDIS_URL || '';
export const jwtSecret = process.env.JWT_SECRET || '';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const googleClientIds = ( process.env.GOOGLE_CLIENT_ID || '')
  .split(',')
  .map((clientId) => clientId.trim())
  .filter(Boolean);
export const facebookAppId = process.env.FACEBOOK_APP_ID || '';
export const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';
export const facebookGraphVersion = process.env.FACEBOOK_GRAPH_VERSION || '';

export default {
  apiPrefix,
  facebookAppId,
  facebookAppSecret,
  facebookGraphVersion,
  frontendUrl,
  googleClientIds,
  jwtExpiresIn,
  jwtSecret,
  mongoDbName,
  mongoUri,
  nodeEnv,
  port,
  redisUrl,
};
