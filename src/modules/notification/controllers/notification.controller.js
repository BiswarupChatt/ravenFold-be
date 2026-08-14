import { sendSuccess } from '@/common/helpers/response.helper.js';
import notificationService from '@/modules/notification/services/notification.service.js';

const verifyWhatsappWebhook = async (req, res) => {
  const challenge = notificationService.verifyWhatsappWebhook(req.query);

  return res.status(200).send(challenge);
};

const handleWhatsappWebhook = async (req, res) => {
  await notificationService.handleWhatsappWebhook(req.body);

  return sendSuccess(res, null, 'WhatsApp webhook received');
};

export {
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
};

export default {
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
};
