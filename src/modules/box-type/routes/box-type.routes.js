import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import boxTypeController from '@/modules/box-type/controllers/box-type.controller.js';

const router = express.Router();

router.get('/status', asyncHandler(boxTypeController.getStatus));

router.get(
  '/admin/:boxTypeIdOrCode',
  authenticateUser,
  adminMiddleware,
  asyncHandler(boxTypeController.getAdminBoxType),
);

router
  .route('/admin')
  .get(authenticateUser, adminMiddleware, asyncHandler(boxTypeController.listAdminBoxTypes))
  .post(authenticateUser, adminMiddleware, asyncHandler(boxTypeController.createBoxType));

router
  .route('/admin/:boxTypeId')
  .patch(authenticateUser, adminMiddleware, asyncHandler(boxTypeController.updateBoxType))
  .delete(authenticateUser, adminMiddleware, asyncHandler(boxTypeController.deleteBoxType));

router.get('/', asyncHandler(boxTypeController.listBoxTypes));
router.get('/:boxTypeIdOrCode', asyncHandler(boxTypeController.getBoxType));

export default router;
