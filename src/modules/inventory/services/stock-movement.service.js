import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  hasOwn,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import StockMovement from '@/modules/inventory/models/stock-movement.model.js';
import { formatStockMovement } from '@/modules/inventory/services/inventory.service.js';

const buildListFilter = (query = {}) => {
  const filter = {};

  if (hasOwn(query, 'inventoryStockId')) {
    filter.inventoryStockId = normalizeObjectId(query.inventoryStockId, 'inventory stock id');
  }

  if (hasOwn(query, 'productId')) {
    filter.productId = normalizeObjectId(query.productId, 'product id');
  }

  if (hasOwn(query, 'variantId')) {
    filter.variantId = normalizeOptionalObjectId(query.variantId, 'variant id');
  }

  if (hasOwn(query, 'orderId')) {
    filter.orderId = normalizeOptionalObjectId(query.orderId, 'order id');
  }

  if (hasOwn(query, 'type')) {
    filter.type = normalizeText(query.type);
  }

  return filter;
};

const listStockMovements = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(query);
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    StockMovement.countDocuments(filter).exec(),
  ]);

  return {
    items: movements.map(formatStockMovement),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

const getStockMovement = async (movementId) => {
  assertDatabaseReady();
  const normalizedMovementId = normalizeObjectId(movementId, 'stock movement id');
  const movement = await StockMovement.findById(normalizedMovementId).lean().exec();

  if (!movement) {
    throw new ApiError(404, 'Stock movement not found');
  }

  return formatStockMovement(movement);
};

export {
  getStockMovement,
  listStockMovements,
};

export default {
  getStockMovement,
  listStockMovements,
};
