import ApiError from '@/common/errors/api.error.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  escapeRegex,
  getDocumentId,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizePositiveInteger,
  normalizeText,
} from '@/common/utils/service.util.js';
import Cart from '@/modules/cart/models/cart.model.js';
import CartItem from '@/modules/cart/models/cart-item.model.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import OrderStatusHistory from '@/modules/order/models/order-status-history.model.js';
import Order from '@/modules/order/models/order.model.js';
import inventoryService from '@/modules/inventory/services/inventory.service.js';
import Product from '@/modules/product/models/product.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Payment from '@/modules/payment/models/payment.model.js';
import Refund from '@/modules/payment/models/refund.model.js';
import { formatPayment, formatRefund } from '@/modules/payment/services/refund.service.js';
import Address from '@/modules/users/models/address.model.js';
import User from '@/modules/users/models/user.model.js';

const DEFAULT_CURRENCY = 'INR';
const requiredAddressFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'country'];

const getStatusData = () => {
  return {
    module: 'orders',
    paymentStatuses: Object.values(PAYMENT_STATUS),
    statuses: Object.values(ORDER_STATUS),
  };
};

const normalizeOrderStatus = (value) => {
  const normalizedStatus = normalizeText(value).toLowerCase();
  const allowedStatuses = Object.values(ORDER_STATUS);

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, `status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return normalizedStatus;
};

const normalizePaymentStatus = (value) => {
  const normalizedStatus = normalizeText(value).toLowerCase();
  const allowedStatuses = Object.values(PAYMENT_STATUS);

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, `paymentStatus must be one of: ${allowedStatuses.join(', ')}`);
  }

  return normalizedStatus;
};

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) {
      throw new Error('Missing actor id');
    }

    normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }

  return actor.id;
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

const normalizeAddressSnapshot = (address = {}, field = 'address') => {
  const snapshot = {};

  for (const addressField of requiredAddressFields) {
    snapshot[addressField] = normalizeText(address[addressField]);

    if (!snapshot[addressField]) {
      throw new ApiError(400, `${field}.${addressField} is required`);
    }
  }

  snapshot.addressLine2 = normalizeText(address.addressLine2);
  snapshot.addressType = normalizeText(address.addressType) || 'home';

  if (!['home', 'work'].includes(snapshot.addressType)) {
    throw new ApiError(400, `${field}.addressType must be either home or work`);
  }

  if (!/^[6-9]\d{9}$/.test(snapshot.phone)) {
    throw new ApiError(400, `${field}.phone must be a valid 10 digit mobile number`);
  }

  if (!/^\d{6}$/.test(snapshot.pincode)) {
    throw new ApiError(400, `${field}.pincode must be exactly 6 digits`);
  }

  return snapshot;
};

const getAddressSnapshot = async (userId, addressId, field) => {
  const normalizedAddressId = normalizeObjectId(addressId, `${field} id`);
  const address = await Address.findOne({
    _id: normalizedAddressId,
    userId,
  })
    .lean()
    .exec();

  if (!address) {
    throw new ApiError(404, `${field} not found`);
  }

  return normalizeAddressSnapshot(address, field);
};

const resolveBillingAddressSnapshot = async ({ billingSameAsShipping, payload, shippingAddress, userId }) => {
  if (billingSameAsShipping) {
    return shippingAddress;
  }

  if (payload.billingAddressId) {
    return getAddressSnapshot(userId, payload.billingAddressId, 'billingAddress');
  }

  return normalizeAddressSnapshot(payload.billingAddress || {}, 'billingAddress');
};

const getActiveCartWithItems = async (userId) => {
  const cart = await Cart.findOne({
    userId,
    status: 'active',
  }).exec();

  if (!cart) {
    throw new ApiError(404, 'Active cart not found');
  }

  const items = await CartItem.find({ cartId: cart._id }).sort({ createdAt: 1 }).lean().exec();

  if (!items.length) {
    throw new ApiError(400, 'Cannot create an order from an empty cart');
  }

  return {
    cart,
    items,
  };
};

const resolveOrderItemTarget = async (cartItem) => {
  const productId = normalizeObjectId(cartItem.productId, 'product id');
  const variantId = normalizeOptionalObjectId(cartItem.variantId, 'variant id');
  const product = await Product.findOne({
    _id: productId,
    status: 'active',
  })
    .select('_id name slug sku basePrice salePrice hasVariants images status')
    .lean()
    .exec();

  if (!product) {
    throw new ApiError(404, 'Product in cart is no longer available');
  }

  if (product.hasVariants && !variantId) {
    throw new ApiError(400, `Variant is required for ${product.name}`);
  }

  if (!product.hasVariants && variantId) {
    throw new ApiError(400, `Variant is not valid for ${product.name}`);
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
      throw new ApiError(404, `Variant for ${product.name} is no longer available`);
    }
  }

  const priceSource = variant || product;
  const basePrice = variant ? variant.price : product.basePrice;
  const salePrice = priceSource.salePrice;
  const price = Number((salePrice ?? basePrice).toFixed(2));
  const quantity = normalizePositiveInteger(cartItem.quantity);

  return {
    productId,
    variantId,
    quantity,
    priceAtTime: price,
    lineTotal: Number((price * quantity).toFixed(2)),
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
      variantLabel: formatVariantLabel(variant),
    },
  };
};

const buildOrderItems = async (cartItems) => {
  return Promise.all(cartItems.map(resolveOrderItemTarget));
};

const calculateTotals = (items) => {
  const summary = items.reduce(
    (totals, item) => {
      const basePrice = Number(item.priceSnapshot.basePrice || item.priceAtTime);
      const mrp = Math.max(basePrice, item.priceAtTime);

      return {
        subtotal: totals.subtotal + item.lineTotal,
        totalMrp: totals.totalMrp + (mrp * item.quantity),
        totalQuantity: totals.totalQuantity + item.quantity,
      };
    },
    {
      subtotal: 0,
      totalMrp: 0,
      totalQuantity: 0,
    },
  );
  const subtotal = Number(summary.subtotal.toFixed(2));
  const totalMrp = Number(Math.max(summary.totalMrp, subtotal).toFixed(2));
  const bagDiscount = Number(Math.max(totalMrp - subtotal, 0).toFixed(2));
  const couponDiscount = 0;
  const shippingCharge = 0;
  const totalPayable = Number(Math.max(subtotal - couponDiscount + shippingCharge, 0).toFixed(2));

  return {
    bagDiscount,
    couponDiscount,
    itemCount: items.length,
    shippingCharge,
    subtotal,
    totalMrp,
    totalPayable,
    totalQuantity: summary.totalQuantity,
  };
};

const createOrderNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `RF-${datePart}-${randomPart}`;
};

const formatAddressSnapshot = (address = {}) => ({
  addressLine1: address.addressLine1 || '',
  addressLine2: address.addressLine2 || '',
  addressType: address.addressType || 'home',
  city: address.city || '',
  country: address.country || '',
  fullName: address.fullName || '',
  phone: address.phone || '',
  pincode: address.pincode || '',
  state: address.state || '',
});

const formatOrderItem = (item) => ({
  id: item.id || item._id?.toString(),
  lineTotal: item.lineTotal,
  orderId: getDocumentId(item.orderId),
  priceAtTime: item.priceAtTime,
  priceSnapshot: item.priceSnapshot,
  productId: getDocumentId(item.productId),
  productSnapshot: item.productSnapshot,
  quantity: item.quantity,
  variantId: getDocumentId(item.variantId),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const formatOrder = (order, items = [], paymentDetails = {}) => ({
  id: order.id || order._id?.toString(),
  bagDiscount: order.bagDiscount,
  billingAddress: formatAddressSnapshot(order.billingAddress),
  billingSameAsShipping: Boolean(order.billingSameAsShipping),
  cancelledAt: order.cancelledAt,
  cartId: getDocumentId(order.cartId),
  couponDiscount: order.couponDiscount,
  createdAt: order.createdAt,
  currency: order.currency || DEFAULT_CURRENCY,
  itemCount: order.itemCount,
  items: items.map(formatOrderItem),
  notes: order.notes || '',
  orderNumber: order.orderNumber,
  paidAt: order.paidAt,
  payment: paymentDetails.payment || null,
  paymentFailureReason: order.paymentFailureReason || '',
  paymentMethod: order.paymentMethod || '',
  paymentProvider: order.paymentProvider || '',
  paymentStatus: order.paymentStatus,
  placedAt: order.placedAt,
  providerOrderId: order.providerOrderId || '',
  providerPaymentId: order.providerPaymentId || '',
  refunds: paymentDetails.refunds || [],
  shippingAddress: formatAddressSnapshot(order.shippingAddress),
  shippingCharge: order.shippingCharge,
  status: order.status,
  subtotal: order.subtotal,
  totalMrp: order.totalMrp,
  totalPayable: order.totalPayable,
  totalQuantity: order.totalQuantity,
  updatedAt: order.updatedAt,
  userId: getDocumentId(order.userId),
});

const formatUserSummary = (user) => {
  if (!user || typeof user !== 'object' || !user._id) {
    return null;
  }

  return {
    avatar: user.avatar || '',
    email: user.email || '',
    id: user._id.toString(),
    isActive: user.isActive !== false,
    name: user.name || '',
    phone: user.phone || '',
    role: user.role || '',
  };
};

const formatAdminOrder = (order, items = [], paymentDetails = {}) => ({
  ...formatOrder(order, items, paymentDetails),
  user: formatUserSummary(order.userId),
});

const getOrderItems = async (orderId) => {
  return OrderItem.find({ orderId }).sort({ createdAt: 1 }).lean().exec();
};

const getOrderPaymentDetails = async (orderId) => {
  const payment = await Payment.findOne({ orderId }).sort({ paidAt: -1, createdAt: -1 }).lean().exec();

  if (!payment) {
    return {
      payment: null,
      refunds: [],
    };
  }

  const refunds = await Refund.find({ paymentId: payment._id }).sort({ createdAt: -1 }).lean().exec();

  return {
    payment: formatPayment(payment),
    refunds: refunds.map(formatRefund),
  };
};

const getOrderItemsByOrderIds = async (orderIds = []) => {
  if (!orderIds.length) {
    return new Map();
  }

  const items = await OrderItem.find({ orderId: { $in: orderIds } }).sort({ createdAt: 1 }).lean().exec();
  const itemsByOrderId = new Map();

  for (const item of items) {
    const orderId = getDocumentId(item.orderId);
    const currentItems = itemsByOrderId.get(orderId) || [];

    currentItems.push(item);
    itemsByOrderId.set(orderId, currentItems);
  }

  return itemsByOrderId;
};

const buildAdminOrderSearchFilter = async (searchValue = '') => {
  const search = normalizeText(searchValue);

  if (!search) {
    return null;
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');
  const [users, orderItemOrderIds] = await Promise.all([
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
    OrderItem.distinct('orderId', {
      $or: [
        { 'productSnapshot.name': searchRegex },
        { 'productSnapshot.sku': searchRegex },
        { 'productSnapshot.variantSku': searchRegex },
        { 'productSnapshot.variantLabel': searchRegex },
      ],
    }).exec(),
  ]);

  const searchConditions = [
    { orderNumber: searchRegex },
  ];
  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    searchConditions.push({ userId: { $in: userIds } });
  }

  if (orderItemOrderIds.length > 0) {
    searchConditions.push({ _id: { $in: orderItemOrderIds } });
  }

  if (isValidObjectId(search)) {
    searchConditions.push(
      { _id: search },
      { userId: search },
      { cartId: search },
    );
  }

  return { $or: searchConditions };
};

const buildAdminOrderFilter = async (query = {}) => {
  const filter = {};
  const status = normalizeText(query.status).toLowerCase();
  const paymentStatus = normalizeText(query.paymentStatus).toLowerCase();

  if (status && status !== 'all') {
    filter.status = normalizeOrderStatus(status);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    filter.paymentStatus = normalizePaymentStatus(paymentStatus);
  }

  const searchFilter = await buildAdminOrderSearchFilter(query.search);

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  return filter;
};

const reserveOrderInventory = async ({ actor, orderId, orderItems }) => {
  const reservedItems = [];

  try {
    for (const item of orderItems) {
      await inventoryService.reserveInventoryStock({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        orderId,
        note: `Reserved for order ${orderId}`,
      }, actor);
      reservedItems.push(item);
    }
  } catch (error) {
    for (const item of reservedItems.reverse()) {
      try {
        await inventoryService.releaseInventoryReservation({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          orderId,
          note: `Reservation rollback for order ${orderId}`,
        }, actor);
      } catch {
        // Keep the original checkout error; stock movement logs can be reconciled by order id.
      }
    }

    throw error;
  }
};

const releaseOrderInventory = async ({ actor, orderId, orderItems }) => {
  for (const item of orderItems.slice().reverse()) {
    try {
      await inventoryService.releaseInventoryReservation({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        orderId,
        note: `Released checkout reservation for order ${orderId}`,
      }, actor);
    } catch {
      // Preserve the checkout failure; stock movement logs can be reconciled by order id.
    }
  }
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Orders module ready');
};

const createCheckoutOrder = async (actor, payload = {}) => {
  assertDatabaseReady();
  const userId = normalizeUserId(actor);
  const shippingAddressId = normalizeObjectId(payload.shippingAddressId, 'shipping address id');
  const billingSameAsShipping = hasOwn(payload, 'billingSameAsShipping')
    ? normalizeBoolean(payload.billingSameAsShipping, 'billingSameAsShipping')
    : true;
  const shippingAddress = await getAddressSnapshot(userId, shippingAddressId, 'shippingAddress');
  const billingAddress = await resolveBillingAddressSnapshot({
    billingSameAsShipping,
    payload,
    shippingAddress,
    userId,
  });
  const { cart, items: cartItems } = await getActiveCartWithItems(userId);
  const orderItems = await buildOrderItems(cartItems);
  const totals = calculateTotals(orderItems);
  let order = null;
  let createdItems = [];
  let inventoryReserved = false;

  try {
    order = await Order.create({
      ...totals,
      billingAddress,
      billingSameAsShipping,
      cartId: cart._id,
      currency: cart.currency || DEFAULT_CURRENCY,
      notes: normalizeText(payload.notes),
      orderNumber: createOrderNumber(),
      paymentStatus: PAYMENT_STATUS.PENDING,
      shippingAddress,
      status: ORDER_STATUS.PENDING,
      userId,
    });

    createdItems = await OrderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        orderId: order._id,
      })),
    );

    await reserveOrderInventory({
      actor,
      orderId: order._id,
      orderItems,
    });
    inventoryReserved = true;

    await OrderStatusHistory.create({
      createdBy: userId,
      note: 'Order created from checkout',
      orderId: order._id,
      toPaymentStatus: PAYMENT_STATUS.PENDING,
      toStatus: ORDER_STATUS.PENDING,
    });

    cart.status = 'converted';
    cart.expiresAt = null;
    await cart.save();

    return formatOrder(order, createdItems);
  } catch (error) {
    if (inventoryReserved && order) {
      await releaseOrderInventory({
        actor,
        orderId: order._id,
        orderItems,
      });
    }

    if (createdItems.length > 0) {
      await OrderItem.deleteMany({ orderId: order._id }).exec();
    }

    if (order) {
      await order.deleteOne();
    }

    throw error;
  }
};

const buildCustomerOrderFilter = (userId, query = {}) => {
  const filter = { userId };
  const status = normalizeText(query.status).toLowerCase();
  const paymentStatus = normalizeText(query.paymentStatus).toLowerCase();

  if (status && status !== 'all') {
    filter.status = normalizeOrderStatus(status);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    filter.paymentStatus = normalizePaymentStatus(paymentStatus);
  }

  return filter;
};

const listCustomerOrders = async (actor, query = {}) => {
  assertDatabaseReady();
  const userId = normalizeUserId(actor);
  const { limit, page, skip } = getPagination(query);
  const filter = buildCustomerOrderFilter(userId, query);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ placedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Order.countDocuments(filter).exec(),
  ]);
  const itemsByOrderId = await getOrderItemsByOrderIds(orders.map((order) => order._id));

  return {
    items: orders.map((order) => formatOrder(order, itemsByOrderId.get(getDocumentId(order._id)) || [])),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getCustomerOrder = async (actor, orderId) => {
  assertDatabaseReady();
  const userId = normalizeUserId(actor);
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const order = await Order.findOne({
    _id: normalizedOrderId,
    userId,
  })
    .lean()
    .exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const [items, paymentDetails] = await Promise.all([
    getOrderItems(order._id),
    getOrderPaymentDetails(order._id),
  ]);

  return formatOrder(order, items, paymentDetails);
};

const listAdminOrders = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = await buildAdminOrderFilter(query);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate({ path: 'userId', select: 'name email phone avatar role isActive' })
      .sort({ placedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Order.countDocuments(filter).exec(),
  ]);

  return {
    items: orders.map((order) => formatAdminOrder(order)),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAdminOrder = async (orderId) => {
  assertDatabaseReady();
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const order = await Order.findById(normalizedOrderId)
    .populate({ path: 'userId', select: 'name email phone avatar role isActive' })
    .lean()
    .exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const [items, paymentDetails] = await Promise.all([
    getOrderItems(order._id),
    getOrderPaymentDetails(order._id),
  ]);

  return formatAdminOrder(order, items, paymentDetails);
};

export {
  createCheckoutOrder,
  getAdminOrder,
  getCustomerOrder,
  getStatus,
  getStatusData,
  listCustomerOrders,
  listAdminOrders,
};

export default {
  createCheckoutOrder,
  getAdminOrder,
  getCustomerOrder,
  getStatus,
  getStatusData,
  listCustomerOrders,
  listAdminOrders,
};
