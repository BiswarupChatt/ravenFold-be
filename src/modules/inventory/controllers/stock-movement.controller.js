import { sendSuccess } from '@/common/helpers/response.helper.js';
import stockMovementService from '@/modules/inventory/services/stock-movement.service.js';

const listAdminStockMovements = async (req, res) => {
  return sendSuccess(res, await stockMovementService.listStockMovements(req.query), 'Stock movements fetched');
};

const getAdminStockMovement = async (req, res) => {
  return sendSuccess(
    res,
    await stockMovementService.getStockMovement(req.params.movementId),
    'Stock movement fetched',
  );
};

export {
  getAdminStockMovement,
  listAdminStockMovements,
};

export default {
  getAdminStockMovement,
  listAdminStockMovements,
};
