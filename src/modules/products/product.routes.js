import express from 'express';

import productController from '@/modules/products/product.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(productController.getStatus));

export default router;
