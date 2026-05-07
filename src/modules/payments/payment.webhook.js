async function processPaymentWebhook(payload) {
  return {
    received: Boolean(payload),
  };
}

module.exports = {
  processPaymentWebhook,
};
