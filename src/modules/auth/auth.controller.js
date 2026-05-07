const authService = require('./auth.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

async function getStatus(req, res) {
  return sendSuccess(res, authService.getStatus(), 'Auth module ready');
}

async function login(req, res) {
  return sendSuccess(res, await authService.login(req.body), 'Login flow not implemented yet');
}

async function verifyOtp(req, res) {
  return sendSuccess(res, await authService.verifyOtp(req.body), 'OTP verification flow not implemented yet');
}

module.exports = {
  getStatus,
  login,
  verifyOtp,
};
