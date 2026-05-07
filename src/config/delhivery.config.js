require('./env.config');

module.exports = {
  baseUrl: process.env.DELHIVERY_BASE_URL || '',
  token: process.env.DELHIVERY_TOKEN || '',
  pickupLocation: process.env.DELHIVERY_PICKUP_LOCATION || '',
};
