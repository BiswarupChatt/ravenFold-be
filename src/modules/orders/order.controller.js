const orderService = require('./order.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

async function getStatus(req, res) {
  return sendSuccess(res, orderService.getStatus(), 'Orders module ready');
}

module.exports = {
  getStatus,
};
