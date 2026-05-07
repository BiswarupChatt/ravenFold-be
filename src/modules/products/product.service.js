const productRepository = require('./product.repository');

function getStatus() {
  return {
    module: 'products',
    repository: productRepository.name,
  };
}

module.exports = {
  getStatus,
};
