import { paymentDefaultProvider } from '@/config/env.config.js';
import razorpayConfig from '@/config/razorpay.config.js';

export default {
  defaultProvider: paymentDefaultProvider,
  razorpay: razorpayConfig,
};
