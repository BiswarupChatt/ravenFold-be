const cartRepository = require('./cart.repository');

function getStatus() {
  return {
    module: 'cart',
    repository: cartRepository.name,
  };
}

module.exports = {
  getStatus,
};
