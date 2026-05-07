import paymentService from '@/modules/payments/payment.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

async function getStatus(req, res) {
  return sendSuccess(res, paymentService.getStatus(), 'Payments module ready');
}

async function handleWebhook(req, res) {
  return sendSuccess(res, await paymentService.handleWebhook(req.body), 'Payment webhook received');
}

export { getStatus, handleWebhook };

export default {
  getStatus,
  handleWebhook,
};