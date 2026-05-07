import express from 'express';

import authController from '@/modules/auth/auth.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';

const router = express.Router();

router.get('/', asyncHandler(authController.getStatus));
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/verify-otp', asyncHandler(authController.verifyOtp));
router.get('/me', authenticateUser, asyncHandler(authController.getMe));

export default router;
