import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import addressController from '@/modules/users/controllers/address.controller.js';

const router = express.Router();

router.use(authenticateUser);

router
  .route('/')
  .get(asyncHandler(addressController.listAddresses))
  .post(asyncHandler(addressController.createAddress));

router
  .route('/:addressId')
  .get(asyncHandler(addressController.getAddress))
  .patch(asyncHandler(addressController.updateAddress))
  .delete(asyncHandler(addressController.deleteAddress));

export default router;
