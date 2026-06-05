import ApiError from '@/common/errors/api.error.js';
import { SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';
import delhiveryProvider from '@/modules/shipping/providers/delhivery.provider.js';
import manualProvider from '@/modules/shipping/providers/manual.provider.js';
import shiprocketProvider from '@/modules/shipping/providers/shiprocket.provider.js';

const providers = {
  [SHIPPING_PROVIDER.DELHIVERY]: delhiveryProvider,
  [SHIPPING_PROVIDER.MANUAL]: manualProvider,
  [SHIPPING_PROVIDER.SHIPROCKET]: shiprocketProvider,
};

const getShippingProvider = (providerName) => {
  const provider = providers[providerName];

  if (!provider) {
    throw new ApiError(400, `Unsupported shipping provider: ${providerName}`);
  }

  return provider;
};

const listShippingProviders = () => Object.keys(providers);

export {
  getShippingProvider,
  listShippingProviders,
};

export default {
  getShippingProvider,
  listShippingProviders,
};
