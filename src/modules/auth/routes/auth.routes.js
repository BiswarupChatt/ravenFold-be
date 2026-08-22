import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import { rateLimiters } from '@/common/middleware/rateLimit.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import authService from '@/modules/auth/services/auth.service.js';
import {
  adminLoginSchema,
  adminMfaCodeSchema,
  changePasswordSchema,
  facebookAuthSchema,
  googleAuthSchema,
  loginSchema,
  requestPasswordResetSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/modules/auth/validators/auth.validator.js';

const router = express.Router();

router.get('/', asyncHandler(authService.getStatus));
router.post('/register', rateLimiters.auth, validate(registerSchema), asyncHandler(authService.register));
router.post('/login', rateLimiters.auth, validate(loginSchema), asyncHandler(authService.login));
router.post('/admin/login', rateLimiters.auth, validate(adminLoginSchema), asyncHandler(authService.loginAdmin));
router.get('/admin/mfa', authenticateUser, adminMiddleware, asyncHandler(authService.getAdminMfa));
router.post('/admin/mfa/setup', authenticateUser, adminMiddleware, asyncHandler(authService.setupAdminMfa));
router.post('/admin/mfa/enable', authenticateUser, adminMiddleware, validate(adminMfaCodeSchema), asyncHandler(authService.enableAdminMfa));
router.post('/admin/mfa/disable', authenticateUser, adminMiddleware, validate(adminMfaCodeSchema), asyncHandler(authService.disableAdminMfa));
router.post('/request-password-reset', rateLimiters.passwordReset, validate(requestPasswordResetSchema), asyncHandler(authService.requestPasswordReset));
router.post('/reset-password', rateLimiters.passwordReset, validate(resetPasswordSchema), asyncHandler(authService.resetPassword));
router.post('/google', rateLimiters.auth, validate(googleAuthSchema), asyncHandler(authService.googleAuth));
router.post('/facebook', rateLimiters.auth, validate(facebookAuthSchema), asyncHandler(authService.facebookAuth));
router.post('/verify-otp', rateLimiters.auth, asyncHandler(authService.verifyOtp));
router.get('/me', authenticateUser, asyncHandler(authService.getMe));
router.post('/change-password', authenticateUser, validate(changePasswordSchema), asyncHandler(authService.changePassword));

export default router;
