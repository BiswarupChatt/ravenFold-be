import express from 'express';

import userService from '@/modules/users/user.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';

const router = express.Router();

router.get('/', asyncHandler(userService.getStatus));
router.get('/me', authenticateUser, asyncHandler(userService.getMe));
router.patch('/me', authenticateUser, asyncHandler(userService.updateMe));

export default router;
