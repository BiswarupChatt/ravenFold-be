const PAYMENT_PROVIDER = Object.freeze({
  JUSPAY: 'juspay',
  RAZORPAY: 'razorpay',
});

const PAYMENT_ATTEMPT_STATUS = Object.freeze({
  AUTHORIZED: 'authorized',
  CANCELLED: 'cancelled',
  CREATED: 'created',
  FAILED: 'failed',
  PAID: 'paid',
  PENDING: 'pending',
});

const PAYMENT_RECORD_STATUS = Object.freeze({
  PAID: 'paid',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
});

const PAYMENT_METHOD = Object.freeze({
  CARD: 'card',
  COD: 'cod',
  EMI: 'emi',
  NETBANKING: 'netbanking',
  UPI: 'upi',
  WALLET: 'wallet',
  UNKNOWN: 'unknown',
});

const REFUND_STATUS = Object.freeze({
  FAILED: 'failed',
  PENDING: 'pending',
  PROCESSED: 'processed',
});

export {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_RECORD_STATUS,
  REFUND_STATUS,
};

export default {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_RECORD_STATUS,
  REFUND_STATUS,
};
