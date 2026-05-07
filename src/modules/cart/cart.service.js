import cartRepository from '@/modules/cart/cart.repository.js';

function getStatus() {
  return {
    module: 'cart',
    repository: cartRepository.name,
  };
}

export { getStatus };

export default {
  getStatus,
};