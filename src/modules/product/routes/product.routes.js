import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import productController from '@/modules/product/controllers/product.controller.js';

const router = express.Router();

router.get('/status', asyncHandler(productController.getStatus));
router.post(
  '/uploads/cloudinary-signature',
  authenticateUser,
  adminMiddleware,
  asyncHandler(productController.createProductImageUploadSignature),
);
router.get(
  '/admin/:productIdOrSlug',
  authenticateUser,
  adminMiddleware,
  asyncHandler(productController.getAdminProduct),
);
router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(productController.listAdminProducts),
);

router
  .route('/')
  .get(asyncHandler(productController.listProducts))
  .post(authenticateUser, adminMiddleware, asyncHandler(productController.createProduct));

router.get('/:productIdOrSlug', asyncHandler(productController.getProduct));

router
  .route('/:productId')
  .patch(authenticateUser, adminMiddleware, asyncHandler(productController.updateProduct))
  .delete(authenticateUser, adminMiddleware, asyncHandler(productController.deleteProduct));

export default router;
