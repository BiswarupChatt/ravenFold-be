import express from 'express';

import inventoryService from '@/modules/inventory/inventory.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, inventoryService.getStatus(), 'Inventory module ready');
});

export default router;
