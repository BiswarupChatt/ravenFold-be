import '@/config/env.config.js';

export default {
  baseUrl: process.env.DELHIVERY_BASE_URL || '',
  token: process.env.DELHIVERY_TOKEN || '',
  pickupLocation: process.env.DELHIVERY_PICKUP_LOCATION || '',
};