const productService = require('./product.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

async function getStatus(req, res) {
  return sendSuccess(res, productService.getStatus(), 'Products module ready');
}

module.exports = {
  getStatus,
};
