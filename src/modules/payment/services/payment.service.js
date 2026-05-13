import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'payments',
  };
};

const processWebhook = async (payload) => {
  return {
    received: Boolean(payload),
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Payments module ready');
};

const handleWebhook = async (req, res) => {
  return sendSuccess(res, await processWebhook(req.body), 'Payment webhook received');
};

export { getStatus, handleWebhook, processWebhook };

export default {
  getStatus,
  handleWebhook,
  processWebhook,
};
