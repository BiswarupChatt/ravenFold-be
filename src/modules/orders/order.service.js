const orderRepository = require('./order.repository');

function getStatus() {
  return {
    module: 'orders',
    repository: orderRepository.name,
  };
}

module.exports = {
  getStatus,
};
