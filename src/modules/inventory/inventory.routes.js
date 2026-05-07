import express from 'express';

import inventoryService from '@/modules/inventory/inventory.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(inventoryService.getStatus));

export default router;
