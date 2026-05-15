import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import categoryController from '@/modules/category/controllers/category.controller.js';

const router = express.Router();

router.get('/status', asyncHandler(categoryController.getStatus));
router.get('/tree', asyncHandler(categoryController.listCategoryTree));
router.get(
  '/admin/tree',
  authenticateUser,
  adminMiddleware,
  asyncHandler(categoryController.listAdminCategoryTree),
);
router.get(
  '/admin/:categoryIdOrSlug',
  authenticateUser,
  adminMiddleware,
  asyncHandler(categoryController.getAdminCategory),
);
router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(categoryController.listAdminCategories),
);

router
  .route('/')
  .get(asyncHandler(categoryController.listCategories))
  .post(authenticateUser, adminMiddleware, asyncHandler(categoryController.createCategory));

router.get('/:categoryIdOrSlug', asyncHandler(categoryController.getCategory));

router
  .route('/:categoryId')
  .patch(authenticateUser, adminMiddleware, asyncHandler(categoryController.updateCategory))
  .delete(authenticateUser, adminMiddleware, asyncHandler(categoryController.deleteCategory));

export default router;
