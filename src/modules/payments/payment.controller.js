const paymentService = require('./payment.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

async function getStatus(req, res) {
  return sendSuccess(res, paymentService.getStatus(), 'Payments module ready');
}

async function handleWebhook(req, res) {
  return sendSuccess(res, await paymentService.handleWebhook(req.body), 'Payment webhook received');
}

module.exports = {
  getStatus,
  handleWebhook,
};
