import express from 'express';

import productService from '@/modules/products/product.service.js';
import productValidation from '@/modules/products/product.validation.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';

const router = express.Router();

const adminOnly = [authenticateUser, adminMiddleware];

router.get('/status', asyncHandler(productService.getStatus));
router.get(
  '/',
  validate(productValidation.listProductsQuerySchema, 'query'),
  asyncHandler(productService.listProducts),
);
router.post(
  '/',
  ...adminOnly,
  validate(productValidation.createProductSchema),
  asyncHandler(productService.createProduct),
);
router.get('/:identifier', asyncHandler(productService.getProduct));
router.patch(
  '/:productId',
  ...adminOnly,
  validate(productValidation.productIdParamSchema, 'params'),
  validate(productValidation.updateProductSchema),
  asyncHandler(productService.updateProduct),
);
router.delete(
  '/:productId',
  ...adminOnly,
  validate(productValidation.productIdParamSchema, 'params'),
  asyncHandler(productService.deleteProduct),
);

export default router;
