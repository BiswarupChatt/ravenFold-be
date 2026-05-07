const authRepository = require('./auth.repository');

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

module.exports = {
  getStatus,
  login,
  verifyOtp,
};
