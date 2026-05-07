import paymentRepository from '@/modules/payments/payment.repository.js';

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

export { getStatus, handleWebhook };

export default {
  getStatus,
  handleWebhook,
};