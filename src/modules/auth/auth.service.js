import authRepository from '@/modules/auth/auth.repository.js';

function getStatus() {
  return {
    module: 'auth',
    repository: authRepository.name,
  };
}

async function login(payload) {
  return {
    received: Boolean(payload),
    token: null,
  };
}

async function verifyOtp(payload) {
  return {
    received: Boolean(payload),
    verified: false,
  };
}

export { getStatus, login, verifyOtp };

export default {
  getStatus,
  login,
  verifyOtp,
};