import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import addressController from '@/modules/users/controllers/address.controller.js';
import {
  createAddressSchema,
  updateAddressSchema,
} from '@/modules/users/validators/user.validator.js';

const router = express.Router();

router.use(authenticateUser);

router
  .route('/')
  .get(asyncHandler(addressController.listAddresses))
  .post(validate(createAddressSchema), asyncHandler(addressController.createAddress));

router
  .route('/:addressId')
  .get(asyncHandler(addressController.getAddress))
  .patch(validate(updateAddressSchema), asyncHandler(addressController.updateAddress))
  .delete(asyncHandler(addressController.deleteAddress));

export default router;
