import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';

const createShipment = async ({ payload = {} }) => {
  const hasTrackingDetails = Boolean(payload.awbCode || payload.trackingUrl || payload.courierName);

  return {
    awbCode: payload.awbCode || '',
    courierName: payload.courierName || 'Manual',
    invoiceUrl: payload.invoiceUrl || '',
    labelUrl: payload.labelUrl || '',
    providerOrderId: '',
    providerShipmentId: '',
    providerStatus: hasTrackingDetails ? 'manual_shipped' : 'manual_created',
    rawProviderResponse: null,
    status: hasTrackingDetails ? SHIPMENT_STATUS.IN_TRANSIT : SHIPMENT_STATUS.LABEL_CREATED,
    trackingUrl: payload.trackingUrl || '',
  };
};

const cancelShipment = async ({ shipment }) => ({
  rawProviderResponse: null,
  status: SHIPMENT_STATUS.CANCELLED,
  providerStatus: shipment?.providerStatus || 'manual_cancelled',
});

export default {
  cancelShipment,
  createShipment,
  name: SHIPPING_PROVIDER.MANUAL,
};
