async function processPaymentWebhook(payload) {
  return {
    received: Boolean(payload),
  };
}

export { processPaymentWebhook };

export default {
  processPaymentWebhook,
};