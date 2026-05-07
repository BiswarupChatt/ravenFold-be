import express from 'express';

import productService from '@/modules/products/product.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(productService.getStatus));

export default router;
