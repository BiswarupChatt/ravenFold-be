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
export const trustProxy = process.env.TRUST_PROXY || (nodeEnv === 'production' ? '1' : '');
export const frontendUrl = process.env.FRONTEND_URL || '*';
export const adminUrl = process.env.ADMIN_URL || '';
export const emailProvider = process.env.EMAIL_PROVIDER || 'log';
export const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'no-reply@ravenfold.local';
export const emailFromName = process.env.EMAIL_FROM_NAME || 'Raven Fold';
export const emailReplyToAddress = process.env.EMAIL_REPLY_TO_ADDRESS || emailFromAddress;
export const emailReplyToName = process.env.EMAIL_REPLY_TO_NAME || emailFromName;
export const emailRequestTimeoutMs = Number(process.env.EMAIL_REQUEST_TIMEOUT_MS) || 10000;
export const zeptoMailApiUrl = process.env.ZEPTO_MAIL_API_URL || 'https://api.zeptomail.com/v1.1/email';
export const zeptoMailSendToken = process.env.ZEPTO_MAIL_SEND_TOKEN || '';
const parseOriginList = (value = '') => String(value || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
export const corsAllowedOrigins = parseOriginList(process.env.CORS_ALLOWED_ORIGINS).length > 0
  ? parseOriginList(process.env.CORS_ALLOWED_ORIGINS)
  : parseOriginList([frontendUrl, adminUrl].filter((origin) => origin && origin !== '*').join(','));
export const mongoUri = process.env.MONGO_URI || '';
export const mongoDbName = process.env.MONGO_DB_NAME || 'ravenfold';
export const jwtSecret = process.env.JWT_SECRET || '';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const adminJwtExpiresIn = process.env.ADMIN_JWT_EXPIRES_IN || '1h';
export const authLoginThrottleMaxAttempts = Number(process.env.AUTH_LOGIN_THROTTLE_MAX_ATTEMPTS) || 5;
export const authLoginThrottleWindowMs = Number(process.env.AUTH_LOGIN_THROTTLE_WINDOW_MS) || 900000;
export const authLoginThrottleLockoutMs = Number(process.env.AUTH_LOGIN_THROTTLE_LOCKOUT_MS) || 1800000;
export const passwordResetTokenTtlMs = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MS) || 1800000;
export const rateLimitAuthWindowMs = Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 900000;
export const rateLimitAuthMax = Number(process.env.RATE_LIMIT_AUTH_MAX) || 30;
export const rateLimitPasswordResetWindowMs = Number(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS) || 3600000;
export const rateLimitPasswordResetMax = Number(process.env.RATE_LIMIT_PASSWORD_RESET_MAX) || 5;
export const rateLimitCheckoutWindowMs = Number(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS) || 900000;
export const rateLimitCheckoutMax = Number(process.env.RATE_LIMIT_CHECKOUT_MAX) || 20;
export const rateLimitPaymentWindowMs = Number(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS) || 900000;
export const rateLimitPaymentMax = Number(process.env.RATE_LIMIT_PAYMENT_MAX) || 40;
export const rateLimitUploadWindowMs = Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 900000;
export const rateLimitUploadMax = Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 30;
export const rateLimitWebhookWindowMs = Number(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS) || 60000;
export const rateLimitWebhookMax = Number(process.env.RATE_LIMIT_WEBHOOK_MAX) || 120;
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
export const shippingDefaultProvider = process.env.SHIPPING_DEFAULT_PROVIDER || 'manual';
export const shiprocketEmail = process.env.SHIPROCKET_EMAIL || '';
export const shiprocketPassword = process.env.SHIPROCKET_PASSWORD || '';
export const shiprocketBaseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
export const shiprocketPickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || '';
export const shiprocketWebhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET || '';
export const delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';
export const delhiveryToken = process.env.DELHIVERY_TOKEN || '';
export const delhiveryPickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || '';
export const whatsappWebhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

export default {
  adminUrl,
  adminJwtExpiresIn,
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
  corsAllowedOrigins,
  emailFromAddress,
  emailFromName,
  emailProvider,
  emailReplyToAddress,
  emailReplyToName,
  emailRequestTimeoutMs,
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
  rateLimitAuthMax,
  rateLimitAuthWindowMs,
  rateLimitCheckoutMax,
  rateLimitCheckoutWindowMs,
  rateLimitPasswordResetMax,
  rateLimitPasswordResetWindowMs,
  rateLimitPaymentMax,
  rateLimitPaymentWindowMs,
  rateLimitUploadMax,
  rateLimitUploadWindowMs,
  rateLimitWebhookMax,
  rateLimitWebhookWindowMs,
  reviewReminderBatchSize,
  reviewReminderDelayDays,
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
  trustProxy,
  unpaidOrderExpiryBatchSize,
  unpaidOrderExpiryIntervalMs,
  unpaidOrderExpiryMinutes,
  whatsappWebhookVerifyToken,
  zeptoMailApiUrl,
  zeptoMailSendToken,
};
