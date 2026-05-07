import userRepository from '@/modules/users/user.repository.js';

function getStatus() {
  return {
    module: 'users',
    repository: userRepository.name,
  };
}

export { getStatus };

export default {
  getStatus,
};