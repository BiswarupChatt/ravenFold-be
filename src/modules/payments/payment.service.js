const paymentRepository = require('./payment.repository');

function getStatus() {
  return {
    module: 'payments',
    repository: paymentRepository.name,
  };
}

async function handleWebhook(payload) {
  return {
    received: Boolean(payload),
  };
}

module.exports = {
  getStatus,
  handleWebhook,
};
