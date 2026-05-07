import express from 'express';

import userService from '@/modules/users/user.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(userService.getStatus));

export default router;
