import productService from '@/modules/products/product.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

async function getStatus(req, res) {
  return sendSuccess(res, productService.getStatus(), 'Products module ready');
}

export { getStatus };

export default {
  getStatus,
};