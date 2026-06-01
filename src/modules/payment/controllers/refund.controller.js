import { sendSuccess } from '@/common/helpers/response.helper.js';
import refundService from '@/modules/payment/services/refund.service.js';

const createAdminRefund = async (req, res) => {
  return sendSuccess(
    res,
    await refundService.createAdminRefund(req.user, req.body),
    'Refund created',
    201,
  );
};

const listAdminRefunds = async (req, res) => {
  return sendSuccess(res, await refundService.listAdminRefunds(req.query), 'Refunds fetched');
};

export {
  createAdminRefund,
  listAdminRefunds,
};

export default {
  createAdminRefund,
  listAdminRefunds,
};
