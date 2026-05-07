import inventoryRepository from '@/modules/inventory/inventory.repository.js';

function getStatus() {
  return {
    module: 'inventory',
    repository: inventoryRepository.name,
  };
}

export { getStatus };

export default {
  getStatus,
};