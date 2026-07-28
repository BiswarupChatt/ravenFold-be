import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import announcementBannerController from '@/modules/announcement-banner/controllers/announcement-banner.controller.js';
import {
  createAnnouncementBannerSchema,
  updateAnnouncementBannerSchema,
  updateAnnouncementBannerStatusSchema,
} from '@/modules/announcement-banner/announcement-banner.validator.js';

const router = express.Router();

router.get('/active', asyncHandler(announcementBannerController.listActiveAnnouncementBanners));

router
  .route('/')
  .get(
    authenticateUser,
    adminMiddleware,
    asyncHandler(announcementBannerController.listAdminAnnouncementBanners),
  )
  .post(
    authenticateUser,
    adminMiddleware,
    validate(createAnnouncementBannerSchema),
    asyncHandler(announcementBannerController.createAnnouncementBanner),
  );

router.patch(
  '/:bannerId/status',
  authenticateUser,
  adminMiddleware,
  validate(updateAnnouncementBannerStatusSchema),
  asyncHandler(announcementBannerController.updateAnnouncementBannerStatus),
);

router
  .route('/:bannerId')
  .get(
    authenticateUser,
    adminMiddleware,
    asyncHandler(announcementBannerController.getAnnouncementBannerById),
  )
  .patch(
    authenticateUser,
    adminMiddleware,
    validate(updateAnnouncementBannerSchema),
    asyncHandler(announcementBannerController.updateAnnouncementBanner),
  )
  .delete(
    authenticateUser,
    adminMiddleware,
    asyncHandler(announcementBannerController.deleteAnnouncementBanner),
  );

export default router;
