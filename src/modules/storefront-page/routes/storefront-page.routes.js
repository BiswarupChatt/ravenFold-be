import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import storefrontPageController from '@/modules/storefront-page/controllers/storefront-page.controller.js';
import { updateStorefrontPageSchema } from '@/modules/storefront-page/storefront-page.validator.js';

const router = express.Router();

router.get('/home', asyncHandler(storefrontPageController.getPublicHomePage));

router
  .route('/admin/home')
  .get(authenticateUser, adminMiddleware, asyncHandler(storefrontPageController.getAdminHomePage))
  .put(
    authenticateUser,
    adminMiddleware,
    validate(updateStorefrontPageSchema),
    asyncHandler(storefrontPageController.updateAdminHomePage),
  );

export default router;
