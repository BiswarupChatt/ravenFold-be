import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import addressRoutes from '@/modules/users/routes/address.routes.js';
import userController from '@/modules/users/controllers/user.controller.js';

const router = express.Router();

router.get('/', asyncHandler(userController.getStatus));
router.get('/me', authenticateUser, asyncHandler(userController.getMe));
router.patch('/me', authenticateUser, asyncHandler(userController.updateMe));
router.use('/addresses', addressRoutes);

export default router;
