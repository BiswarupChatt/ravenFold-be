import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  escapeRegex,
  getDocumentId,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeNonNegativeInteger,
  normalizeNonZeroInteger,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizePositiveInteger,
  normalizeText,
} from '@/common/utils/service.util.js';
import InventoryStock from '@/modules/inventory/models/inventory.model.js';
import StockMovement from '@/modules/inventory/models/stock-movement.model.js';
import Product from '@/modules/product/models/product.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';

const editableInventoryFields = [
  'stockOnHand',
  'reservedQuantity',
  'lowStockThreshold',
  'trackInventory',
  'allowBackorder',
];

const normalizeCreatedBy = (actor = null) => {
  try {
    if (!actor?.id) {
      return null;
    }

    normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    return null;
  }

  return actor.id;
};

const formatProductSummary = (product) => {
  if (!product || typeof product !== 'object' || !product._id) {
    return null;
  }

  return {
    id: product._id.toString(),
    name: product.name,
    sku: product.sku,
    hasVariants: Boolean(product.hasVariants),
  };
};

const formatVariantSummary = (variant) => {
  if (!variant || typeof variant !== 'object' || !variant._id) {
    return null;
  }

  return {
    id: variant._id.toString(),
    sku: variant.sku,
    optionValues: variant.optionValues || [],
    isActive: Boolean(variant.isActive),
  };
};

const getAvailableQuantity = (stock) => Math.max((stock.stockOnHand || 0) - (stock.reservedQuantity || 0), 0);

const formatInventoryStock = (stock) => {
  const availableQuantity = getAvailableQuantity(stock);

  return {
    id: stock.id || stock._id?.toString(),
    productId: getDocumentId(stock.productId),
    variantId: getDocumentId(stock.variantId),
    product: formatProductSummary(stock.productId),
    variant: formatVariantSummary(stock.variantId),
    stockOnHand: stock.stockOnHand,
    reservedQuantity: stock.reservedQuantity,
    availableQuantity,
    lowStockThreshold: stock.lowStockThreshold,
    isLowStock: Boolean(stock.trackInventory) && availableQuantity <= stock.lowStockThreshold,
    trackInventory: Boolean(stock.trackInventory),
    allowBackorder: Boolean(stock.allowBackorder),
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
};

const formatStockMovement = (movement) => ({
  id: movement.id || movement._id?.toString(),
  inventoryStockId: getDocumentId(movement.inventoryStockId),
  productId: getDocumentId(movement.productId),
  variantId: getDocumentId(movement.variantId),
  type: movement.type,
  quantity: movement.quantity,
  stockOnHandBefore: movement.stockOnHandBefore,
  stockOnHandAfter: movement.stockOnHandAfter,
  reservedQuantityBefore: movement.reservedQuantityBefore,
  reservedQuantityAfter: movement.reservedQuantityAfter,
  orderId: getDocumentId(movement.orderId),
  note: movement.note || '',
  createdBy: getDocumentId(movement.createdBy),
  createdAt: movement.createdAt,
});

const getStatusData = () => ({
  module: 'inventory',
});

const assertTargetExists = async ({ productId, variantId }) => {
  const product = await Product.findById(productId).select('_id name sku hasVariants').lean().exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!variantId) {
    if (product.hasVariants) {
      throw new ApiError(400, 'variantId is required when the product has variants');
    }

    return {
      product,
      variant: null,
    };
  }

  if (!product.hasVariants) {
    throw new ApiError(400, 'variantId can only be used when the product has variants');
  }

  const variant = await ProductVariant.findOne({ _id: variantId, productId })
    .select('_id productId sku optionValues isActive')
    .lean()
    .exec();

  if (!variant) {
    throw new ApiError(404, 'Product variant not found for this product');
  }

  return {
    product,
    variant,
  };
};

const normalizeTargetPayload = (payload = {}) => ({
  productId: normalizeObjectId(payload.productId, 'product id'),
  variantId: normalizeOptionalObjectId(payload.variantId, 'variant id'),
});

const buildInventoryPayload = (payload = {}, { requireTarget = false } = {}) => {
  const inventoryPayload = {};

  if (requireTarget || hasOwn(payload, 'productId')) {
    inventoryPayload.productId = normalizeObjectId(payload.productId, 'product id');
  }

  if (requireTarget || hasOwn(payload, 'variantId')) {
    inventoryPayload.variantId = normalizeOptionalObjectId(payload.variantId, 'variant id');
  }

  for (const field of editableInventoryFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'trackInventory' || field === 'allowBackorder') {
      inventoryPayload[field] = normalizeBoolean(payload[field], field);
      continue;
    }

    inventoryPayload[field] = normalizeNonNegativeInteger(payload[field], field);
  }

  return inventoryPayload;
};

const buildSearchFilter = async (query = {}) => {
  const search = normalizeText(query.search);

  if (!search) {
    return null;
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');
  const [products, variants] = await Promise.all([
    Product.find({
      $or: [
        { name: searchRegex },
        { slug: searchRegex },
        { sku: searchRegex },
      ],
    })
      .select('_id')
      .lean()
      .exec(),
    ProductVariant.find({
      $or: [
        { sku: searchRegex },
        { 'optionValues.optionName': searchRegex },
        { 'optionValues.value': searchRegex },
      ],
    })
      .select('_id productId')
      .lean()
      .exec(),
  ]);

  const productIds = products.map((product) => product._id);
  const variantIds = variants.map((variant) => variant._id);
  const searchConditions = [];

  if (productIds.length > 0) {
    searchConditions.push({ productId: { $in: productIds } });
  }

  if (variantIds.length > 0) {
    searchConditions.push({ variantId: { $in: variantIds } });
  }

  if (isValidObjectId(search)) {
    searchConditions.push(
      { _id: search },
      { productId: search },
      { variantId: search },
    );
  }

  if (searchConditions.length === 0) {
    return { _id: { $in: [] } };
  }

  return { $or: searchConditions };
};

const buildListFilter = async (query = {}) => {
  const filter = {};

  if (hasOwn(query, 'productId')) {
    filter.productId = normalizeObjectId(query.productId, 'product id');
  }

  if (hasOwn(query, 'variantId')) {
    filter.variantId = normalizeOptionalObjectId(query.variantId, 'variant id');
  }

  if (hasOwn(query, 'trackInventory')) {
    filter.trackInventory = normalizeBoolean(query.trackInventory, 'trackInventory');
  }

  if (hasOwn(query, 'lowStock') && normalizeBoolean(query.lowStock, 'lowStock')) {
    filter.trackInventory = true;
    filter.$expr = {
      $lte: [
        {
          $subtract: ['$stockOnHand', '$reservedQuantity'],
        },
        '$lowStockThreshold',
      ],
    };
  }

  const searchFilter = await buildSearchFilter(query);

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  return filter;
};

const getInventoryStockDocument = async (inventoryStockId) => {
  assertDatabaseReady();
  const normalizedInventoryStockId = normalizeObjectId(inventoryStockId, 'inventory stock id');
  const stock = await InventoryStock.findById(normalizedInventoryStockId).exec();

  if (!stock) {
    throw new ApiError(404, 'Inventory stock not found');
  }

  return stock;
};

const findInventoryStockByTarget = async ({ productId, variantId }) => {
  assertDatabaseReady();
  const stock = await InventoryStock.findOne({
    productId,
    variantId: variantId || null,
  }).exec();

  if (!stock) {
    throw new ApiError(404, 'Inventory stock not found');
  }

  return stock;
};

const resolveInventoryStock = async (payload = {}) => {
  if (payload.inventoryStockId) {
    return getInventoryStockDocument(payload.inventoryStockId);
  }

  return findInventoryStockByTarget(normalizeTargetPayload(payload));
};

const recordMovement = async ({
  stockAfter,
  stockOnHandBefore,
  reservedQuantityBefore,
  type,
  quantity,
  note = '',
  orderId = null,
  actor = null,
}) => {
  const movement = await StockMovement.create({
    inventoryStockId: stockAfter._id,
    productId: stockAfter.productId,
    variantId: stockAfter.variantId || null,
    type,
    quantity,
    stockOnHandBefore,
    stockOnHandAfter: stockAfter.stockOnHand,
    reservedQuantityBefore,
    reservedQuantityAfter: stockAfter.reservedQuantity,
    orderId: normalizeOptionalObjectId(orderId, 'order id'),
    note: normalizeText(note),
    createdBy: normalizeCreatedBy(actor),
  });

  return formatStockMovement(movement);
};

const createInventoryStock = async (payload = {}, actor = null) => {
  assertDatabaseReady();
  const inventoryPayload = buildInventoryPayload(payload, { requireTarget: true });

  await assertTargetExists(inventoryPayload);

  try {
    const stock = await InventoryStock.create(inventoryPayload);

    if (stock.stockOnHand > 0 || stock.reservedQuantity > 0) {
      await recordMovement({
        stockAfter: stock,
        stockOnHandBefore: 0,
        reservedQuantityBefore: 0,
        type: 'adjustment',
        quantity: stock.stockOnHand || stock.reservedQuantity,
        note: payload.note || 'Initial inventory stock',
        actor,
      });
    }

    return formatInventoryStock(stock);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Inventory stock already exists for this product target');
    }

    throw error;
  }
};

const listInventoryStocks = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = await buildListFilter(query);
  const [stocks, total] = await Promise.all([
    InventoryStock.find(filter)
      .populate({ path: 'productId', select: 'name sku hasVariants' })
      .populate({ path: 'variantId', select: 'sku optionValues isActive' })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    InventoryStock.countDocuments(filter).exec(),
  ]);

  return {
    items: stocks.map(formatInventoryStock),
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

const getInventoryStock = async (inventoryStockId) => {
  const stock = await getInventoryStockDocument(inventoryStockId);
  await stock.populate({ path: 'productId', select: 'name sku hasVariants' });
  await stock.populate({ path: 'variantId', select: 'sku optionValues isActive' });

  return formatInventoryStock(stock);
};

const getInventoryStockForTarget = async (payload = {}) => {
  const stock = await findInventoryStockByTarget(normalizeTargetPayload(payload));
  await stock.populate({ path: 'productId', select: 'name sku hasVariants' });
  await stock.populate({ path: 'variantId', select: 'sku optionValues isActive' });

  return formatInventoryStock(stock);
};

const updateInventoryStock = async (inventoryStockId, payload = {}, actor = null) => {
  const stock = await getInventoryStockDocument(inventoryStockId);
  const inventoryPayload = buildInventoryPayload(payload);
  const before = {
    stockOnHand: stock.stockOnHand,
    reservedQuantity: stock.reservedQuantity,
  };

  if (Object.keys(inventoryPayload).length === 0) {
    throw new ApiError(400, 'No inventory fields provided to update');
  }

  if (hasOwn(inventoryPayload, 'productId') || hasOwn(inventoryPayload, 'variantId')) {
    throw new ApiError(400, 'Create a new inventory stock record to change product or variant');
  }

  Object.assign(stock, inventoryPayload);

  try {
    await stock.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Inventory stock already exists for this product target');
    }

    throw error;
  }

  if (before.stockOnHand !== stock.stockOnHand || before.reservedQuantity !== stock.reservedQuantity) {
    await recordMovement({
      stockAfter: stock,
      stockOnHandBefore: before.stockOnHand,
      reservedQuantityBefore: before.reservedQuantity,
      type: 'adjustment',
      quantity: stock.stockOnHand - before.stockOnHand || stock.reservedQuantity - before.reservedQuantity,
      note: payload.note || 'Inventory stock updated',
      actor,
    });
  }

  return formatInventoryStock(stock);
};

const deleteInventoryStock = async (inventoryStockId) => {
  const stock = await getInventoryStockDocument(inventoryStockId);

  if (stock.reservedQuantity > 0) {
    throw new ApiError(400, 'Cannot delete inventory stock with reserved quantity');
  }

  const deletedStock = formatInventoryStock(stock);

  await stock.deleteOne();

  return deletedStock;
};

const adjustInventoryStock = async (payload = {}, actor = null) => {
  assertDatabaseReady();
  const quantity = normalizeNonZeroInteger(payload.quantity);
  const stock = await resolveInventoryStock(payload);
  const filter = {
    _id: stock._id,
  };

  if (quantity < 0) {
    filter.stockOnHand = {
      $gte: Math.abs(quantity),
    };

    if (!stock.allowBackorder) {
      filter.$expr = {
        $gte: [
          {
            $add: ['$stockOnHand', quantity],
          },
          '$reservedQuantity',
        ],
      };
    }
  }

  const updatedStock = await InventoryStock.findOneAndUpdate(
    filter,
    {
      $inc: {
        stockOnHand: quantity,
      },
    },
    {
      new: true,
    },
  ).exec();

  if (!updatedStock) {
    throw new ApiError(409, 'Inventory adjustment would make stock invalid');
  }

  await recordMovement({
    stockAfter: updatedStock,
    stockOnHandBefore: updatedStock.stockOnHand - quantity,
    reservedQuantityBefore: updatedStock.reservedQuantity,
    type: 'adjustment',
    quantity,
    note: payload.note,
    actor,
  });

  return formatInventoryStock(updatedStock);
};

const reserveInventoryStock = async (payload = {}, actor = null) => {
  assertDatabaseReady();
  const quantity = normalizePositiveInteger(payload.quantity);
  const stock = await resolveInventoryStock(payload);

  if (!stock.trackInventory) {
    return formatInventoryStock(stock);
  }

  const filter = {
    _id: stock._id,
  };

  if (!stock.allowBackorder) {
    filter.$expr = {
      $gte: [
        {
          $subtract: ['$stockOnHand', '$reservedQuantity'],
        },
        quantity,
      ],
    };
  }

  const updatedStock = await InventoryStock.findOneAndUpdate(
    filter,
    {
      $inc: {
        reservedQuantity: quantity,
      },
    },
    {
      new: true,
    },
  ).exec();

  if (!updatedStock) {
    throw new ApiError(409, 'Insufficient inventory available to reserve');
  }

  await recordMovement({
    stockAfter: updatedStock,
    stockOnHandBefore: updatedStock.stockOnHand,
    reservedQuantityBefore: updatedStock.reservedQuantity - quantity,
    type: 'reservation',
    quantity,
    note: payload.note,
    orderId: payload.orderId,
    actor,
  });

  return formatInventoryStock(updatedStock);
};

const releaseInventoryReservation = async (payload = {}, actor = null) => {
  assertDatabaseReady();
  const quantity = normalizePositiveInteger(payload.quantity);
  const stock = await resolveInventoryStock(payload);

  if (!stock.trackInventory) {
    return formatInventoryStock(stock);
  }

  const updatedStock = await InventoryStock.findOneAndUpdate(
    {
      _id: stock._id,
      reservedQuantity: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        reservedQuantity: -quantity,
      },
    },
    {
      new: true,
    },
  ).exec();

  if (!updatedStock) {
    throw new ApiError(409, 'Reserved quantity is lower than the release quantity');
  }

  await recordMovement({
    stockAfter: updatedStock,
    stockOnHandBefore: updatedStock.stockOnHand,
    reservedQuantityBefore: updatedStock.reservedQuantity + quantity,
    type: 'reservation_release',
    quantity,
    note: payload.note,
    orderId: payload.orderId,
    actor,
  });

  return formatInventoryStock(updatedStock);
};

const commitInventorySale = async (payload = {}, actor = null) => {
  assertDatabaseReady();
  const quantity = normalizePositiveInteger(payload.quantity);
  const stock = await resolveInventoryStock(payload);

  if (!stock.trackInventory) {
    return formatInventoryStock(stock);
  }

  const updatedStock = await InventoryStock.findOneAndUpdate(
    {
      _id: stock._id,
      stockOnHand: {
        $gte: quantity,
      },
      reservedQuantity: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        stockOnHand: -quantity,
        reservedQuantity: -quantity,
      },
    },
    {
      new: true,
    },
  ).exec();

  if (!updatedStock) {
    throw new ApiError(409, 'Reserved inventory is not available to commit sale');
  }

  await recordMovement({
    stockAfter: updatedStock,
    stockOnHandBefore: updatedStock.stockOnHand + quantity,
    reservedQuantityBefore: updatedStock.reservedQuantity + quantity,
    type: 'sale',
    quantity,
    note: payload.note,
    orderId: payload.orderId,
    actor,
  });

  return formatInventoryStock(updatedStock);
};

export {
  adjustInventoryStock,
  commitInventorySale,
  createInventoryStock,
  deleteInventoryStock,
  formatInventoryStock,
  formatStockMovement,
  getInventoryStock,
  getInventoryStockForTarget,
  getStatusData,
  listInventoryStocks,
  releaseInventoryReservation,
  reserveInventoryStock,
  updateInventoryStock,
};

export default {
  adjustInventoryStock,
  commitInventorySale,
  createInventoryStock,
  deleteInventoryStock,
  getInventoryStock,
  getInventoryStockForTarget,
  getStatusData,
  listInventoryStocks,
  releaseInventoryReservation,
  reserveInventoryStock,
  updateInventoryStock,
};
