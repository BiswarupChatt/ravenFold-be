import express from 'express';

import authController from '@/modules/auth/auth.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(authController.getStatus));
router.post('/login', asyncHandler(authController.login));
router.post('/verify-otp', asyncHandler(authController.verifyOtp));

export default router;
