import express from 'express';

import adminRoutes from '@/routes/admin.routes.js';
import analyticsRoutes from '@/modules/analytics/routes/analytics.routes.js';
import authRoutes from '@/modules/auth/routes/auth.routes.js';
import boxTypeRoutes from '@/modules/box-type/routes/box-type.routes.js';
import cartRoutes from '@/modules/cart/routes/cart.routes.js';
import categoryRoutes from '@/modules/category/routes/category.routes.js';
import couponRoutes from '@/modules/coupon/routes/coupon.routes.js';
import inventoryRoutes from '@/modules/inventory/routes/inventory.routes.js';
import orderRoutes from '@/modules/order/routes/order.routes.js';
import paymentRoutes from '@/modules/payment/routes/payment.routes.js';
import productRoutes from '@/modules/product/routes/product.routes.js';
import reviewRoutes from '@/modules/review/routes/review.routes.js';
import shippingRoutes from '@/modules/shipping/routes/shipping.routes.js';
import userRoutes from '@/modules/users/routes/user.routes.js';
import wishlistRoutes from '@/modules/wishlist/routes/wishlist.routes.js';

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
router.use('/box-types', boxTypeRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/shipping', shippingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

export default router;
