import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');

dotenv.config({ path: envFilePath, quiet: true });

export const nodeEnv = process.env.NODE_ENV || 'development';
export const port = Number(process.env.PORT) || 3000;
export const apiPrefix = process.env.API_PREFIX || '/api';
export const frontendUrl = process.env.FRONTEND_URL || '*';
export const mongoUri = process.env.MONGO_URI || '';
export const mongoDbName = process.env.MONGO_DB_NAME || 'ravenfold';
export const redisUrl = process.env.REDIS_URL || '';
export const jwtSecret = process.env.JWT_SECRET || '';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const googleClientIds = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
  .split(',')
  .map((clientId) => clientId.trim())
  .filter(Boolean);
export const facebookAppId = process.env.FACEBOOK_APP_ID || '';
export const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';
export const facebookGraphVersion = process.env.FACEBOOK_GRAPH_VERSION || '';
export const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
export const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
export const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';
export const cloudinaryUploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ravenfold/products';
export const paymentDefaultProvider = process.env.PAYMENT_DEFAULT_PROVIDER || 'razorpay';
export const juspayApiKey = process.env.JUSPAY_API_KEY || '';
export const juspayBaseUrl = process.env.JUSPAY_BASE_URL || 'https://api.juspay.in';
export const juspayMerchantId = process.env.JUSPAY_MERCHANT_ID || '';
export const juspayResponseKey = process.env.JUSPAY_RESPONSE_KEY || '';
export const juspayWebhookSecret = process.env.JUSPAY_WEBHOOK_SECRET || '';

export default {
  apiPrefix,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
  cloudinaryUploadFolder,
  facebookAppId,
  facebookAppSecret,
  facebookGraphVersion,
  frontendUrl,
  googleClientIds,
  jwtExpiresIn,
  jwtSecret,
  juspayApiKey,
  juspayBaseUrl,
  juspayMerchantId,
  juspayResponseKey,
  juspayWebhookSecret,
  mongoDbName,
  mongoUri,
  nodeEnv,
  paymentDefaultProvider,
  port,
  redisUrl,
};
