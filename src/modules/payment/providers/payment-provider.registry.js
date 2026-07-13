import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_PROVIDER } from '@/common/constants/payment.constant.js';
import razorpayProvider from '@/modules/payment/providers/razorpay.provider.js';

const providers = {
  [PAYMENT_PROVIDER.RAZORPAY]: razorpayProvider,
};

const getPaymentProvider = (providerName) => {
  const provider = providers[providerName];

  if (!provider) {
    throw new ApiError(400, `Unsupported payment provider: ${providerName}`);
  }

  return provider;
};

const listPaymentProviders = () => Object.keys(providers);

export {
  getPaymentProvider,
  listPaymentProviders,
};

export default {
  getPaymentProvider,
  listPaymentProviders,
};
