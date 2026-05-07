import express from 'express';

import authService from '@/modules/auth/auth.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';

const router = express.Router();

router.get('/', asyncHandler(authService.getStatus));
router.post('/register', asyncHandler(authService.register));
router.post('/login', asyncHandler(authService.login));
router.post('/verify-otp', asyncHandler(authService.verifyOtp));
router.get('/me', authenticateUser, asyncHandler(authService.getMe));

export default router;
