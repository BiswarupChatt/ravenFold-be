const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
};
