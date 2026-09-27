import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import popupCampaignController from '@/modules/popup-campaign.controller.js';
import {
  createPopupCampaignSchema,
  updatePopupCampaignSchema,
  updatePopupCampaignStatusSchema,
} from '@/modules/popup-campaign.validator.js';

const router = express.Router();

router.get('/active', asyncHandler(popupCampaignController.listActivePopupCampaigns));

router
  .route('/')
  .get(authenticateUser, adminMiddleware, asyncHandler(popupCampaignController.listAdminPopupCampaigns))
  .post(
    authenticateUser,
    adminMiddleware,
    validate(createPopupCampaignSchema),
    asyncHandler(popupCampaignController.createPopupCampaign),
  );

router.patch(
  '/:campaignId/status',
  authenticateUser,
  adminMiddleware,
  validate(updatePopupCampaignStatusSchema),
  asyncHandler(popupCampaignController.updatePopupCampaignStatus),
);

router
  .route('/:campaignId')
  .patch(
    authenticateUser,
    adminMiddleware,
    validate(updatePopupCampaignSchema),
    asyncHandler(popupCampaignController.updatePopupCampaign),
  )
  .delete(authenticateUser, adminMiddleware, asyncHandler(popupCampaignController.deletePopupCampaign));

export default router;
