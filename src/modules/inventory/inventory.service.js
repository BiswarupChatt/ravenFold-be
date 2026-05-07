const inventoryRepository = require('./inventory.repository');

function getStatus() {
  return {
    module: 'inventory',
    repository: inventoryRepository.name,
  };
}

module.exports = {
  getStatus,
};
