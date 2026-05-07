import orderRepository from '@/modules/orders/order.repository.js';

function getStatus() {
  return {
    module: 'orders',
    repository: orderRepository.name,
  };
}

export { getStatus };

export default {
  getStatus,
};