import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const inventoryFields = [
  'productId',
  'variantId',
  'stockOnHand',
  'reservedQuantity',
  'lowStockThreshold',
  'trackInventory',
  'allowBackorder',
  'note',
];

const inventoryActionFields = ['inventoryStockId', 'productId', 'variantId', 'quantity', 'orderId', 'note'];

const validateInventoryPayload = (value, { requireTarget = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, inventoryFields);

  if (requireTarget) {
    assertRequiredKeys(payload, ['productId']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, inventoryFields);
  }

  ['productId', 'variantId', 'note'].forEach((field) => assertStringLikeField(payload, field));
  ['stockOnHand', 'reservedQuantity', 'lowStockThreshold'].forEach((field) => assertNumberLikeField(payload, field));
  ['trackInventory', 'allowBackorder'].forEach((field) => assertBooleanField(payload, field));

  return pickAllowedKeys(payload, inventoryFields);
};

const validateInventoryActionPayload = (value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, inventoryActionFields);

  if (!Object.prototype.hasOwnProperty.call(payload, 'inventoryStockId')
    && !Object.prototype.hasOwnProperty.call(payload, 'productId')) {
    throw new Error('body must include inventoryStockId or productId');
  }

  ['inventoryStockId', 'productId', 'variantId', 'orderId', 'note'].forEach((field) => assertStringLikeField(payload, field));
  assertRequiredKeys(payload, ['quantity']);
  assertNumberLikeField(payload, 'quantity');

  return pickAllowedKeys(payload, inventoryActionFields);
};

const createInventoryStockSchema = createSchema((value) => validateInventoryPayload(value, { requireTarget: true }));
const updateInventoryStockSchema = createSchema((value) => validateInventoryPayload(value, { requireAny: true }));
const adjustInventoryStockSchema = createSchema(validateInventoryActionPayload);
const reserveInventoryStockSchema = createSchema(validateInventoryActionPayload);
const releaseInventoryReservationSchema = createSchema(validateInventoryActionPayload);
const commitInventorySaleSchema = createSchema(validateInventoryActionPayload);

export {
  adjustInventoryStockSchema,
  commitInventorySaleSchema,
  createInventoryStockSchema,
  releaseInventoryReservationSchema,
  reserveInventoryStockSchema,
  updateInventoryStockSchema,
};
