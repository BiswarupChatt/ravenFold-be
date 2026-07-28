import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRootPath = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const targetEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const envFileName = process.env.ENV_FILE || `.env.${targetEnv}`;
const envFilePath = resolve(appRootPath, envFileName);
const fallbackEnvFilePath = resolve(appRootPath, '.env');

dotenv.config({ path: envFilePath, quiet: true });
dotenv.config({ path: fallbackEnvFilePath, quiet: true });

export const nodeEnv = process.env.NODE_ENV || 'development';
export const port = Number(process.env.PORT) || 3000;
export const apiPrefix = process.env.API_PREFIX || '/api';
export const frontendUrl = process.env.FRONTEND_URL || '*';
export const mongoUri = process.env.MONGO_URI || '';
export const mongoDbName = process.env.MONGO_DB_NAME || 'ravenfold';
export const jwtSecret = process.env.JWT_SECRET || '';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const authLoginThrottleMaxAttempts = Number(process.env.AUTH_LOGIN_THROTTLE_MAX_ATTEMPTS) || 5;
export const authLoginThrottleWindowMs = Number(process.env.AUTH_LOGIN_THROTTLE_WINDOW_MS) || 900000;
export const authLoginThrottleLockoutMs = Number(process.env.AUTH_LOGIN_THROTTLE_LOCKOUT_MS) || 1800000;
export const passwordResetTokenTtlMs = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MS) || 1800000;
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
export const cloudinaryCategoryUploadFolder = process.env.CLOUDINARY_CATEGORY_UPLOAD_FOLDER || 'ravenfold/categories';
export const cloudinaryGstUploadFolder = process.env.CLOUDINARY_GST_UPLOAD_FOLDER || 'ravenfold/gst';
export const cloudinaryUploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ravenfold/products';
export const cloudinaryReviewUploadFolder = process.env.CLOUDINARY_REVIEW_UPLOAD_FOLDER || 'ravenfold/reviews';
export const paymentDefaultProvider = process.env.PAYMENT_DEFAULT_PROVIDER || 'razorpay';
export const promotionNewUserEligibilityDays = Number(process.env.PROMOTION_NEW_USER_ELIGIBILITY_DAYS) || 30;
export const enablePaymentReconciliationJobs = String(process.env.ENABLE_PAYMENT_RECONCILIATION_JOBS || 'false').trim().toLowerCase() === 'true';
export const paymentReconciliationIntervalMs = Number(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS) || 300000;
export const paymentReconciliationMinAgeMs = Number(process.env.PAYMENT_RECONCILIATION_MIN_AGE_MS) || 300000;
export const paymentReconciliationBatchSize = Number(process.env.PAYMENT_RECONCILIATION_BATCH_SIZE) || 25;
export const enableUnpaidOrderExpiryJobs = String(process.env.ENABLE_UNPAID_ORDER_EXPIRY_JOBS || 'false').trim().toLowerCase() === 'true';
export const unpaidOrderExpiryIntervalMs = Number(process.env.UNPAID_ORDER_EXPIRY_INTERVAL_MS) || 900000;
export const unpaidOrderExpiryMinutes = Number(process.env.UNPAID_ORDER_EXPIRY_MINUTES) || 30;
export const unpaidOrderExpiryBatchSize = Number(process.env.UNPAID_ORDER_EXPIRY_BATCH_SIZE) || 25;
export const enableReviewReminderJobs = String(process.env.ENABLE_REVIEW_REMINDER_JOBS || 'false').trim().toLowerCase() === 'true';
export const reviewReminderDelayDays = Number(process.env.REVIEW_REMINDER_DELAY_DAYS) || 3;
export const reviewReminderJobIntervalMs = Number(process.env.REVIEW_REMINDER_JOB_INTERVAL_MS) || 3600000;
export const reviewReminderMaxAttempts = Number(process.env.REVIEW_REMINDER_MAX_ATTEMPTS) || 3;
export const reviewReminderBatchSize = Number(process.env.REVIEW_REMINDER_BATCH_SIZE) || 25;
export const reviewReminderEmailMode = process.env.REVIEW_REMINDER_EMAIL_MODE || 'log';
export const shippingDefaultProvider = process.env.SHIPPING_DEFAULT_PROVIDER || 'manual';
export const shiprocketEmail = process.env.SHIPROCKET_EMAIL || '';
export const shiprocketPassword = process.env.SHIPROCKET_PASSWORD || '';
export const shiprocketBaseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
export const shiprocketPickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || '';
export const shiprocketWebhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET || '';
export const delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';
export const delhiveryToken = process.env.DELHIVERY_TOKEN || '';
export const delhiveryPickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || '';

export default {
  apiPrefix,
  authLoginThrottleLockoutMs,
  authLoginThrottleMaxAttempts,
  authLoginThrottleWindowMs,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCategoryUploadFolder,
  cloudinaryCloudName,
  cloudinaryGstUploadFolder,
  cloudinaryReviewUploadFolder,
  cloudinaryUploadFolder,
  enablePaymentReconciliationJobs,
  enableReviewReminderJobs,
  enableUnpaidOrderExpiryJobs,
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
  passwordResetTokenTtlMs,
  paymentDefaultProvider,
  paymentReconciliationBatchSize,
  paymentReconciliationIntervalMs,
  paymentReconciliationMinAgeMs,
  port,
  promotionNewUserEligibilityDays,
  reviewReminderBatchSize,
  reviewReminderDelayDays,
  reviewReminderEmailMode,
  reviewReminderJobIntervalMs,
  reviewReminderMaxAttempts,
  delhiveryBaseUrl,
  delhiveryPickupLocation,
  delhiveryToken,
  shiprocketBaseUrl,
  shiprocketEmail,
  shiprocketPassword,
  shiprocketPickupLocation,
  shiprocketWebhookSecret,
  shippingDefaultProvider,
  unpaidOrderExpiryBatchSize,
  unpaidOrderExpiryIntervalMs,
  unpaidOrderExpiryMinutes,
};
