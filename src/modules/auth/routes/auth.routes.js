import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import authService from '@/modules/auth/services/auth.service.js';
import {
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
router.post('/register', validate(registerSchema), asyncHandler(authService.register));
router.post('/login', validate(loginSchema), asyncHandler(authService.login));
router.post('/admin/login', validate(loginSchema), asyncHandler(authService.loginAdmin));
router.post('/request-password-reset', validate(requestPasswordResetSchema), asyncHandler(authService.requestPasswordReset));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(authService.resetPassword));
router.post('/google', validate(googleAuthSchema), asyncHandler(authService.googleAuth));
router.post('/facebook', validate(facebookAuthSchema), asyncHandler(authService.facebookAuth));
router.post('/verify-otp', asyncHandler(authService.verifyOtp));
router.get('/me', authenticateUser, asyncHandler(authService.getMe));
router.post('/change-password', authenticateUser, validate(changePasswordSchema), asyncHandler(authService.changePassword));

export default router;
