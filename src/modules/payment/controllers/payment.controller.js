import { sendSuccess } from '@/common/helpers/response.helper.js';
import paymentService from '@/modules/payment/services/payment.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, paymentService.getStatusData(), 'Payments module ready');
};

const createPaymentSession = async (req, res) => {
  return sendSuccess(
    res,
    await paymentService.createPaymentSession(req.user, req.body),
    'Payment session created',
    201,
  );
};

const verifyPaymentAttempt = async (req, res) => {
  return sendSuccess(
    res,
    await paymentService.verifyPaymentAttempt(req.user, req.params.paymentAttemptId, req.body),
    'Payment verified',
  );
};

const getPaymentAttemptStatus = async (req, res) => {
  return sendSuccess(
    res,
    await paymentService.refreshPaymentAttemptStatus(req.user, req.params.paymentAttemptId),
    'Payment status fetched',
  );
};

const handleProviderWebhook = async (req, res) => {
  return sendSuccess(
    res,
    await paymentService.handleProviderWebhook(req.params.provider, req),
    'Payment webhook received',
  );
};

const handleWebhook = async (req, res) => {
  return sendSuccess(res, await paymentService.processWebhook(req.body), 'Payment webhook received');
};

export {
  createPaymentSession,
  getPaymentAttemptStatus,
  getStatus,
  handleProviderWebhook,
  handleWebhook,
  verifyPaymentAttempt,
};

export default {
  createPaymentSession,
  getPaymentAttemptStatus,
  getStatus,
  handleProviderWebhook,
  handleWebhook,
  verifyPaymentAttempt,
};
