import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import siteSettingsController from '@/modules/site-settings/controllers/site-settings.controller.js';
import { updateSiteSettingsSchema } from '@/modules/site-settings/site-settings.validator.js';

const router = express.Router();

router.get('/', asyncHandler(siteSettingsController.getPublicSiteSettings));

router
  .route('/admin')
  .get(
    authenticateUser,
    adminMiddleware,
    asyncHandler(siteSettingsController.getAdminSiteSettings),
  )
  .put(
    authenticateUser,
    adminMiddleware,
    validate(updateSiteSettingsSchema),
    asyncHandler(siteSettingsController.updateSiteSettings),
  );

export default router;
