import {
  juspayApiKey,
  juspayBaseUrl,
  juspayMerchantId,
  juspayResponseKey,
  juspayWebhookSecret,
  paymentDefaultProvider,
} from '@/config/env.config.js';
import razorpayConfig from '@/config/razorpay.config.js';

export default {
  defaultProvider: paymentDefaultProvider,
  juspay: {
    apiKey: juspayApiKey,
    baseUrl: juspayBaseUrl,
    merchantId: juspayMerchantId,
    responseKey: juspayResponseKey,
    webhookSecret: juspayWebhookSecret,
  },
  razorpay: razorpayConfig,
};
