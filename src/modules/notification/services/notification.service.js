import { whatsappWebhookVerifyToken } from '@/config/env.config.js';
import ApiError from '@/common/errors/api.error.js';
import logger from '@/common/logger/logger.js';

const verifyWhatsappWebhook = (query = {}) => {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token && token === whatsappWebhookVerifyToken) {
    return challenge;
  }

  throw new ApiError(403, 'Invalid WhatsApp webhook verify token');
};

const handleWhatsappWebhook = async (payload = {}) => {
  logger.info('WhatsApp webhook received', {
    object: payload.object,
    entryCount: Array.isArray(payload.entry) ? payload.entry.length : 0,
  });

  return { received: true };
};

export {
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
};

export default {
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
};
