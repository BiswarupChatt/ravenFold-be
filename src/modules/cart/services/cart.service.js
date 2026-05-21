import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import CartItem from '@/modules/cart/models/cart-item.model.js';
import Cart, { cartStatuses } from '@/modules/cart/models/cart.model.js';
import InventoryStock from '@/modules/inventory/models/inventory.model.js';
import Product from '@/modules/product/models/product.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import User from '@/modules/users/models/user.model.js';

const DEFAULT_CURRENCY = 'INR';

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const hasOwn = (source, field) => Object.prototype.hasOwnProperty.call(source, field);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBoolean = (value, field) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  throw new ApiError(400, `${field} must be a boolean`);
};

const normalizeObjectId = (value, field) => {
  const normalizedValue = normalizeText(value);

  if (!mongoose.Types.ObjectId.isValid(normalizedValue)) {
    throw new ApiError(400, `Invalid ${field}`);
  }

  return normalizedValue;
};

const normalizeOptionalObjectId = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return normalizeObjectId(value, field);
};

const normalizePositiveInteger = (value, field = 'quantity') => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }

  return numberValue;
};

const normalizeUserId = (actor = null) => {
  if (!actor?.id || !mongoose.Types.ObjectId.isValid(actor.id)) {
    throw new ApiError(401, 'Authentication required');
  }

  return actor.id;
};

const normalizeCartStatus = (value) => {
  const normalizedStatus = normalizeText(value).toLowerCase();

  if (!cartStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, `status must be one of: ${cartStatuses.join(', ')}`);
  }

  return normalizedStatus;
};

const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const formatVariantLabel = (variant) => {
  if (!variant?.optionValues?.length) {
    return '';
  }

  return variant.optionValues.map((option) => `${option.optionName}: ${option.value}`).join(', ');
};

const getProductImage = (product, variant = null) => {
  if (variant?.images?.length) {
    return variant.images[0];
  }

  if (product?.images?.length) {
    return product.images[0];
  }

  return '';
};

const formatCartItem = (item) => ({
  id: item.id || item._id?.toString(),
  cartId: getDocumentId(item.cartId),
  productId: getDocumentId(item.productId),
  variantId: getDocumentId(item.variantId),
  quantity: item.quantity,
  priceAtTime: item.priceAtTime,
  lineTotal: item.lineTotal,
  priceSnapshot: item.priceSnapshot || null,
  productSnapshot: item.productSnapshot || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const formatCart = (cart, items = []) => ({
  id: cart.id || cart._id?.toString(),
  userId: getDocumentId(cart.userId),
  status: cart.status,
  currency: cart.currency || DEFAULT_CURRENCY,
  subtotal: cart.subtotal,
  itemCount: cart.itemCount,
  totalQuantity: cart.totalQuantity,
  expiresAt: cart.expiresAt,
  items: items.map(formatCartItem),
  createdAt: cart.createdAt,
  updatedAt: cart.updatedAt,
});

const formatUserSummary = (user) => {
  if (!user || typeof user !== 'object' || !user._id) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    role: user.role || '',
    isActive: user.isActive !== false,
  };
};

const formatAdminCart = (cart, items = []) => ({
  ...formatCart(cart, items),
  user: formatUserSummary(cart.userId),
});

const getStatusData = () => ({
  module: 'cart',
  statuses: cartStatuses,
});

const buildAdminCartSearchFilter = async (searchValue = '') => {
  const search = normalizeText(searchValue);

  if (!search) {
    return null;
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');
  const [users, cartItemCartIds] = await Promise.all([
    User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    })
      .select('_id')
      .lean()
      .exec(),
    CartItem.distinct('cartId', {
      $or: [
        { 'productSnapshot.name': searchRegex },
        { 'productSnapshot.sku': searchRegex },
        { 'productSnapshot.variantSku': searchRegex },
        { 'productSnapshot.variantLabel': searchRegex },
      ],
    }).exec(),
  ]);

  const searchConditions = [];
  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    searchConditions.push({ userId: { $in: userIds } });
  }

  if (cartItemCartIds.length > 0) {
    searchConditions.push({ _id: { $in: cartItemCartIds } });
  }

  if (mongoose.Types.ObjectId.isValid(search)) {
    searchConditions.push(
      { _id: search },
      { userId: search },
    );
  }

  if (searchConditions.length === 0) {
    return { _id: { $in: [] } };
  }

  return { $or: searchConditions };
};

const buildAdminCartFilter = async (query = {}) => {
  const filter = {};
  const status = normalizeText(query.status).toLowerCase();
  const includeEmpty = hasOwn(query, 'includeEmpty') && normalizeBoolean(query.includeEmpty, 'includeEmpty');

  if (!includeEmpty) {
    filter.itemCount = { $gt: 0 };
  }

  if (status && status !== 'all') {
    filter.status = normalizeCartStatus(status);
  }

  const searchFilter = await buildAdminCartSearchFilter(query.search);

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  return filter;
};

const getActiveCartDocument = async (userId, { createIfMissing = true } = {}) => {
  assertDatabaseReady();

  const existingCart = await Cart.findOne({
    userId,
    status: 'active',
  }).exec();

  if (existingCart || !createIfMissing) {
    return existingCart;
  }

  try {
    return await Cart.create({
      userId,
      status: 'active',
      currency: DEFAULT_CURRENCY,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Cart.findOne({
        userId,
        status: 'active',
      }).exec();
    }

    throw error;
  }
};

const getCartItems = async (cartId) => {
  return CartItem.find({ cartId }).sort({ createdAt: 1 }).lean().exec();
};

const recalculateCartTotals = async (cart) => {
  const items = await CartItem.find({ cartId: cart._id }).lean().exec();
  const totals = items.reduce(
    (summary, item) => ({
      subtotal: summary.subtotal + Number(item.lineTotal || 0),
      itemCount: summary.itemCount + 1,
      totalQuantity: summary.totalQuantity + Number(item.quantity || 0),
    }),
    {
      subtotal: 0,
      itemCount: 0,
      totalQuantity: 0,
    },
  );

  cart.subtotal = Number(totals.subtotal.toFixed(2));
  cart.itemCount = totals.itemCount;
  cart.totalQuantity = totals.totalQuantity;

  await cart.save();

  return cart;
};

const getCartItemDocument = async (userId, cartItemId) => {
  const normalizedCartItemId = normalizeObjectId(cartItemId, 'cart item id');
  const cart = await getActiveCartDocument(userId, { createIfMissing: false });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = await CartItem.findOne({
    _id: normalizedCartItemId,
    cartId: cart._id,
  }).exec();

  if (!item) {
    throw new ApiError(404, 'Cart item not found');
  }

  return {
    cart,
    item,
  };
};

const buildTargetPayload = (payload = {}) => ({
  productId: normalizeObjectId(payload.productId, 'product id'),
  variantId: normalizeOptionalObjectId(payload.variantId, 'variant id'),
});

const resolveProductTarget = async (payload = {}) => {
  const { productId, variantId } = buildTargetPayload(payload);
  const product = await Product.findOne({
    _id: productId,
    status: 'active',
  })
    .select('_id name slug sku basePrice salePrice hasVariants images status')
    .lean()
    .exec();

  if (!product) {
    throw new ApiError(404, 'Product not found or unavailable');
  }

  if (product.hasVariants && !variantId) {
    throw new ApiError(400, 'variantId is required when the product has variants');
  }

  if (!product.hasVariants && variantId) {
    throw new ApiError(400, 'variantId can only be used when the product has variants');
  }

  let variant = null;

  if (variantId) {
    variant = await ProductVariant.findOne({
      _id: variantId,
      productId,
      isActive: true,
    })
      .select('_id productId sku optionValues price salePrice images isActive')
      .lean()
      .exec();

    if (!variant) {
      throw new ApiError(404, 'Product variant not found or unavailable');
    }
  }

  const priceSource = variant || product;
  const basePrice = variant ? variant.price : product.basePrice;
  const salePrice = priceSource.salePrice;
  const price = Number((salePrice ?? basePrice).toFixed(2));
  const variantLabel = formatVariantLabel(variant);

  return {
    product,
    variant,
    productId,
    variantId,
    priceAtTime: price,
    priceSnapshot: {
      basePrice,
      salePrice: salePrice ?? null,
      price,
      currency: DEFAULT_CURRENCY,
    },
    productSnapshot: {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: getProductImage(product, variant),
      variantSku: variant?.sku || '',
      variantLabel,
    },
  };
};

const assertInventoryAvailable = async ({ productId, variantId, quantity }) => {
  const stock = await InventoryStock.findOne({
    productId,
    variantId: variantId || null,
  })
    .lean()
    .exec();

  if (!stock) {
    throw new ApiError(409, 'Inventory is not configured for this item');
  }

  if (!stock.trackInventory || stock.allowBackorder) {
    return;
  }

  const availableQuantity = Math.max((stock.stockOnHand || 0) - (stock.reservedQuantity || 0), 0);

  if (availableQuantity < quantity) {
    throw new ApiError(409, 'Insufficient inventory available');
  }
};

const buildCartItemPayload = (target, quantity) => ({
  productId: target.productId,
  variantId: target.variantId || null,
  quantity,
  priceAtTime: target.priceAtTime,
  lineTotal: Number((quantity * target.priceAtTime).toFixed(2)),
  priceSnapshot: target.priceSnapshot,
  productSnapshot: target.productSnapshot,
});

const getCart = async (actor) => {
  const userId = normalizeUserId(actor);
  const cart = await getActiveCartDocument(userId);
  const items = await getCartItems(cart._id);

  return formatCart(cart, items);
};

const listAdminCarts = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = await buildAdminCartFilter(query);
  const [carts, total] = await Promise.all([
    Cart.find(filter)
      .populate({ path: 'userId', select: 'name email phone avatar role isActive' })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Cart.countDocuments(filter).exec(),
  ]);

  return {
    items: carts.map((cart) => formatAdminCart(cart)),
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

const getAdminCart = async (cartId) => {
  assertDatabaseReady();
  const normalizedCartId = normalizeObjectId(cartId, 'cart id');
  const cart = await Cart.findById(normalizedCartId)
    .populate({ path: 'userId', select: 'name email phone avatar role isActive' })
    .lean()
    .exec();

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const items = await getCartItems(cart._id);

  return formatAdminCart(cart, items);
};

const addCartItem = async (actor, payload = {}) => {
  const userId = normalizeUserId(actor);
  const quantityToAdd = normalizePositiveInteger(payload.quantity);
  const cart = await getActiveCartDocument(userId);
  const target = await resolveProductTarget(payload);
  const existingItem = await CartItem.findOne({
    cartId: cart._id,
    productId: target.productId,
    variantId: target.variantId || null,
  }).exec();
  const nextQuantity = (existingItem?.quantity || 0) + quantityToAdd;

  await assertInventoryAvailable({
    productId: target.productId,
    variantId: target.variantId,
    quantity: nextQuantity,
  });

  if (existingItem) {
    Object.assign(existingItem, buildCartItemPayload(target, nextQuantity));
    await existingItem.save();
  } else {
    await CartItem.create({
      cartId: cart._id,
      ...buildCartItemPayload(target, quantityToAdd),
    });
  }

  await recalculateCartTotals(cart);

  return formatCart(cart, await getCartItems(cart._id));
};

const updateCartItem = async (actor, cartItemId, payload = {}) => {
  const userId = normalizeUserId(actor);
  const quantity = normalizePositiveInteger(payload.quantity);
  const { cart, item } = await getCartItemDocument(userId, cartItemId);
  const target = await resolveProductTarget({
    productId: item.productId,
    variantId: item.variantId,
  });

  await assertInventoryAvailable({
    productId: target.productId,
    variantId: target.variantId,
    quantity,
  });

  Object.assign(item, buildCartItemPayload(target, quantity));
  await item.save();
  await recalculateCartTotals(cart);

  return formatCart(cart, await getCartItems(cart._id));
};

const removeCartItem = async (actor, cartItemId) => {
  const userId = normalizeUserId(actor);
  const { cart, item } = await getCartItemDocument(userId, cartItemId);

  await item.deleteOne();
  await recalculateCartTotals(cart);

  return formatCart(cart, await getCartItems(cart._id));
};

const clearCart = async (actor) => {
  const userId = normalizeUserId(actor);
  const cart = await getActiveCartDocument(userId, { createIfMissing: false });

  if (!cart) {
    const emptyCart = await getActiveCartDocument(userId);

    return formatCart(emptyCart, []);
  }

  await CartItem.deleteMany({ cartId: cart._id }).exec();
  await recalculateCartTotals(cart);

  return formatCart(cart, []);
};

export {
  addCartItem,
  clearCart,
  getAdminCart,
  getCart,
  getStatusData,
  listAdminCarts,
  removeCartItem,
  updateCartItem,
};

export default {
  addCartItem,
  clearCart,
  getAdminCart,
  getCart,
  getStatusData,
  listAdminCarts,
  removeCartItem,
  updateCartItem,
};
