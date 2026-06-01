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

const PAYMENT_METHOD = Object.freeze({
  CARD: 'card',
  COD: 'cod',
  EMI: 'emi',
  NETBANKING: 'netbanking',
  UPI: 'upi',
  WALLET: 'wallet',
  UNKNOWN: 'unknown',
});

export {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
};

export default {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
};
