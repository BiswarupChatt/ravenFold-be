const userRepository = require('./user.repository');

function getStatus() {
  return {
    module: 'users',
    repository: userRepository.name,
  };
}

module.exports = {
  getStatus,
};
