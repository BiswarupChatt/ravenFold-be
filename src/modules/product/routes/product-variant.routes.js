import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import productVariantController from '@/modules/product/controllers/product-variant.controller.js';
import {
  createProductVariantSchema,
  updateProductVariantSchema,
} from '@/modules/product/validators/product.validator.js';

const router = express.Router({ mergeParams: true });

router.get('/', asyncHandler(productVariantController.listProductVariants));
router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(productVariantController.listAdminProductVariants),
);
router.get(
  '/admin/:variantId',
  authenticateUser,
  adminMiddleware,
  asyncHandler(productVariantController.getAdminProductVariant),
);
router.post(
  '/',
  authenticateUser,
  adminMiddleware,
  validate(createProductVariantSchema),
  asyncHandler(productVariantController.createProductVariant),
);
router.get('/:variantId', asyncHandler(productVariantController.getProductVariant));

router
  .route('/:variantId')
  .patch(authenticateUser, adminMiddleware, validate(updateProductVariantSchema), asyncHandler(productVariantController.updateProductVariant))
  .delete(authenticateUser, adminMiddleware, asyncHandler(productVariantController.deleteProductVariant));

export default router;
