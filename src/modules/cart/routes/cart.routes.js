import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import cartController from '@/modules/cart/controllers/cart.controller.js';
import {
  addCartItemSchema,
  updateCartItemSchema,
} from '@/modules/cart/cart.validator.js';

const router = express.Router();

router.get('/status', asyncHandler(cartController.getStatus));

router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(cartController.listAdminCarts),
);

router.get(
  '/admin/:cartId',
  authenticateUser,
  adminMiddleware,
  asyncHandler(cartController.getAdminCart),
);

router
  .route('/')
  .get(authenticateUser, asyncHandler(cartController.getCart))
  .delete(authenticateUser, asyncHandler(cartController.clearCart));

router.post('/items', authenticateUser, validate(addCartItemSchema), asyncHandler(cartController.addCartItem));

router
  .route('/items/:cartItemId')
  .patch(authenticateUser, validate(updateCartItemSchema), asyncHandler(cartController.updateCartItem))
  .delete(authenticateUser, asyncHandler(cartController.removeCartItem));

export default router;
