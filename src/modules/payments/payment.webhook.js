const processPaymentWebhook = async (payload) => {
  return {
    received: Boolean(payload),
  };
};

export { processPaymentWebhook };

export default {
  processPaymentWebhook,
};
