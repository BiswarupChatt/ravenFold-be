import { sendSuccess } from '@/common/helpers/response.helper.js';
import cartService from '@/modules/cart/services/cart.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, cartService.getStatusData(), 'Cart module ready');
};

const getCart = async (req, res) => {
  return sendSuccess(res, await cartService.getCart(req.user), 'Cart fetched');
};

const calculateCart = async (req, res) => {
  return sendSuccess(res, await cartService.calculateCart(req.user, req.body), 'Cart calculated');
};

const listAdminCarts = async (req, res) => {
  return sendSuccess(res, await cartService.listAdminCarts(req.query), 'Carts fetched');
};

const getAdminCart = async (req, res) => {
  return sendSuccess(res, await cartService.getAdminCart(req.params.cartId), 'Cart fetched');
};

const addCartItem = async (req, res) => {
  return sendSuccess(res, await cartService.addCartItem(req.user, req.body), 'Cart item added', 201);
};

const updateCartItem = async (req, res) => {
  return sendSuccess(
    res,
    await cartService.updateCartItem(req.user, req.params.cartItemId, req.body),
    'Cart item updated',
  );
};

const removeCartItem = async (req, res) => {
  return sendSuccess(
    res,
    await cartService.removeCartItem(req.user, req.params.cartItemId),
    'Cart item removed',
  );
};

const clearCart = async (req, res) => {
  return sendSuccess(res, await cartService.clearCart(req.user), 'Cart cleared');
};

const applyCoupon = async (req, res) => {
  return sendSuccess(res, await cartService.applyCoupon(req.user, req.body), 'Coupon processed');
};

const removeCoupon = async (req, res) => {
  return sendSuccess(res, await cartService.removeCoupon(req.user), 'Coupon removed');
};

export {
  addCartItem,
  applyCoupon,
  calculateCart,
  clearCart,
  getAdminCart,
  getCart,
  getStatus,
  listAdminCarts,
  removeCartItem,
  removeCoupon,
  updateCartItem,
};

export default {
  addCartItem,
  applyCoupon,
  calculateCart,
  clearCart,
  getAdminCart,
  getCart,
  getStatus,
  listAdminCarts,
  removeCartItem,
  removeCoupon,
  updateCartItem,
};
