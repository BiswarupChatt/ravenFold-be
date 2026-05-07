import express from 'express';

import userController from '@/modules/users/user.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(userController.getStatus));

export default router;
