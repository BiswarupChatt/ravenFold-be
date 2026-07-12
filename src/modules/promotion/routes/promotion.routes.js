import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import promotionController from '@/modules/promotion/controllers/promotion.controller.js';
import {
  createPromotionSchema,
  promotionQuerySchema,
  updatePromotionSchema,
  updatePromotionStatusSchema,
} from '@/modules/promotion/validators/promotion.validator.js';

const router = express.Router();

router.get('/active', asyncHandler(promotionController.listPublicActivePromotions));

router
  .route('/')
  .get(
    authenticateUser,
    adminMiddleware,
    validate(promotionQuerySchema, 'query'),
    asyncHandler(promotionController.listAdminPromotions),
  )
  .post(
    authenticateUser,
    adminMiddleware,
    validate(createPromotionSchema),
    asyncHandler(promotionController.createPromotion),
  );

router.patch(
  '/:promotionId/status',
  authenticateUser,
  adminMiddleware,
  validate(updatePromotionStatusSchema),
  asyncHandler(promotionController.updatePromotionStatus),
);

router
  .route('/:promotionId')
  .get(authenticateUser, adminMiddleware, asyncHandler(promotionController.getPromotionById))
  .patch(
    authenticateUser,
    adminMiddleware,
    validate(updatePromotionSchema),
    asyncHandler(promotionController.updatePromotion),
  )
  .delete(authenticateUser, adminMiddleware, asyncHandler(promotionController.deletePromotion));

export default router;
