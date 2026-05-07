import authService from '@/modules/auth/auth.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

async function getStatus(req, res) {
  return sendSuccess(res, authService.getStatus(), 'Auth module ready');
}

async function login(req, res) {
  return sendSuccess(res, await authService.login(req.body), 'Login successful');
}

async function verifyOtp(req, res) {
  return sendSuccess(res, await authService.verifyOtp(req.body), 'OTP verification flow not implemented yet');
}

async function getMe(req, res) {
  return sendSuccess(res, authService.getAuthenticatedUser(req.user), 'Authenticated user fetched');
}

export { getMe, getStatus, login, verifyOtp };

export default {
  getMe,
  getStatus,
  login,
  verifyOtp,
};
