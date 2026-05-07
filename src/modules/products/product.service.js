import productRepository from '@/modules/products/product.repository.js';

function getStatus() {
  return {
    module: 'products',
    repository: productRepository.name,
  };
}

export { getStatus };

export default {
  getStatus,
};