import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import productOptionController from '@/modules/product/controllers/product-option.controller.js';
import {
  createProductOptionSchema,
  createProductOptionValueSchema,
  updateProductOptionSchema,
  updateProductOptionValueSchema,
} from '@/modules/product/validators/product.validator.js';

const router = express.Router({ mergeParams: true });

router.use(authenticateUser, adminMiddleware);

router
  .route('/')
  .get(asyncHandler(productOptionController.listProductOptions))
  .post(validate(createProductOptionSchema), asyncHandler(productOptionController.createProductOption));

router
  .route('/:optionId')
  .get(asyncHandler(productOptionController.getProductOption))
  .patch(validate(updateProductOptionSchema), asyncHandler(productOptionController.updateProductOption))
  .delete(asyncHandler(productOptionController.deleteProductOption));

router
  .route('/:optionId/values')
  .get(asyncHandler(productOptionController.listProductOptionValues))
  .post(validate(createProductOptionValueSchema), asyncHandler(productOptionController.createProductOptionValue));

router
  .route('/:optionId/values/:valueId')
  .get(asyncHandler(productOptionController.getProductOptionValue))
  .patch(validate(updateProductOptionValueSchema), asyncHandler(productOptionController.updateProductOptionValue))
  .delete(asyncHandler(productOptionController.deleteProductOptionValue));

export default router;
