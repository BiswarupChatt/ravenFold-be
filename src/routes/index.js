const express = require('express');

const adminRoutes = require('./admin.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const authRoutes = require('../modules/auth/auth.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const couponRoutes = require('../modules/coupons/coupon.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const orderRoutes = require('../modules/orders/order.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
const productRoutes = require('../modules/products/product.routes');
const reviewRoutes = require('../modules/reviews/review.routes');
const shippingRoutes = require('../modules/shipping/shipping.routes');
const userRoutes = require('../modules/users/user.routes');
const wishlistRoutes = require('../modules/wishlist/wishlist.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the RavenFold API',
  });
});

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/shipping', shippingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
