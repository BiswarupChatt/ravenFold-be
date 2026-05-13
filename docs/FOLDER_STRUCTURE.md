# RavenFold Backend Folder Structure

This backend uses Node.js, Express, native ES modules, and `@/` imports that resolve to `src/`.

The module structure is being moved from flat module files to a layered domain layout:

```text
src/modules/<domain>/
|-- controllers/
|-- services/
|-- routes/
|-- models/
`-- validators/
```

New code should import from the layered folders, not from the old flat module files.

## Top-Level Layout

```text
ravenFold-be/
|-- package.json
|-- package-lock.json
|-- jsconfig.json
|-- index.js
|-- README.md
|-- docker-compose.yml
|-- docs/
|   |-- FOLDER_STRUCTURE.md
|   `-- swagger.js
|-- uploads/
`-- src/
    |-- app.js
    |-- server.js
    |-- routes/
    |   |-- index.js
    |   `-- admin.routes.js
    |-- loaders/
    |   |-- alias-loader.js
    |   `-- alias-register.js
    |-- config/
    |-- common/
    |-- infrastructure/
    `-- modules/
```

## Route Composition

Global route mounting lives in `src/routes`.

```text
src/routes/
|-- index.js
`-- admin.routes.js
```

`src/routes/index.js` mounts public API modules:

```js
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/shipping', shippingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
```

`src/routes/admin.routes.js` applies admin authentication and role checks before mounting admin module routes.

## Module Layout

### Auth

```text
src/modules/auth/
|-- controllers/
|   `-- auth.controller.js
|-- services/
|   `-- auth.service.js
|-- routes/
|   `-- auth.routes.js
|-- models/
|   `-- otp.model.js
|-- validators/
|   `-- auth.validator.js
|-- providers/
|   |-- apple.provider.js
|   |-- facebook.provider.js
|   `-- google.provider.js
|-- dto/
|   |-- login.dto.js
|   |-- register.dto.js
|   `-- verifyOtp.dto.js
|-- auth.events.js
|-- auth.routes.js
|-- auth.service.js
`-- auth.validation.js
```

The flat `auth.routes.js`, `auth.service.js`, and `auth.validation.js` files are legacy compatibility entry points while the migration is in progress.

### Users

```text
src/modules/users/
|-- controllers/
|   `-- user.controller.js
|-- services/
|   `-- user.service.js
|-- routes/
|   `-- user.routes.js
|-- models/
|   `-- user.model.js
|-- validators/
|   `-- user.validator.js
|-- dto/
|   `-- createUser.dto.js
|-- user.model.js
|-- user.routes.js
|-- user.service.js
`-- user.validation.js
```

The flat `user.*.js` files re-export the layered files so older imports keep working.

### Customer

```text
src/modules/customer/
|-- controllers/
|   |-- address.controller.js
|   `-- customer.controller.js
|-- services/
|   |-- address.service.js
|   `-- customer.service.js
|-- routes/
|   |-- address.routes.js
|   `-- customer.routes.js
`-- models/
    |-- address.model.js
    `-- customer.model.js
```

### Catalog

```text
src/modules/category/
|-- controllers/category.controller.js
|-- services/category.service.js
|-- routes/category.routes.js
`-- models/category.model.js

src/modules/brand/
|-- controllers/brand.controller.js
|-- services/brand.service.js
|-- routes/brand.routes.js
`-- models/brand.model.js

src/modules/product/
|-- controllers/
|   |-- product.controller.js
|   |-- product-option.controller.js
|   `-- product-variant.controller.js
|-- services/
|   |-- product.service.js
|   |-- product-option.service.js
|   `-- product-variant.service.js
|-- routes/
|   |-- product.routes.js
|   |-- product-option.routes.js
|   `-- product-variant.routes.js
|-- models/
|   |-- product.model.js
|   |-- product-image.model.js
|   |-- product-option.model.js
|   |-- product-option-value.model.js
|   `-- product-variant.model.js
`-- validators/
    `-- product.validator.js
```

### Inventory

```text
src/modules/inventory/
|-- controllers/
|   |-- inventory.controller.js
|   `-- stock-movement.controller.js
|-- services/
|   |-- inventory.service.js
|   `-- stock-movement.service.js
|-- routes/
|   |-- inventory.routes.js
|   `-- stock-movement.routes.js
`-- models/
    |-- inventory.model.js
    `-- stock-movement.model.js
```

### Cart And Wishlist

```text
src/modules/cart/
|-- controllers/cart.controller.js
|-- services/cart.service.js
|-- routes/cart.routes.js
|-- models/
|   |-- cart.model.js
|   `-- cart-item.model.js
|-- cart.model.js
|-- cart.routes.js
`-- cart.service.js

src/modules/wishlist/
|-- controllers/wishlist.controller.js
|-- services/wishlist.service.js
|-- routes/wishlist.routes.js
|-- models/wishlist.model.js
|-- wishlist.model.js
|-- wishlist.routes.js
`-- wishlist.service.js
```

The flat cart and wishlist files are compatibility entry points.

### Order

```text
src/modules/order/
|-- controllers/
|   `-- order.controller.js
|-- services/
|   `-- order.service.js
|-- routes/
|   `-- order.routes.js
`-- models/
    |-- order.model.js
    |-- order-item.model.js
    `-- order-status-history.model.js
```

### Payment

```text
src/modules/payment/
|-- controllers/
|   |-- payment.controller.js
|   `-- refund.controller.js
|-- services/
|   |-- payment.service.js
|   `-- refund.service.js
|-- routes/
|   |-- payment.routes.js
|   `-- refund.routes.js
`-- models/
    |-- payment.model.js
    `-- refund.model.js
```

### Shipping

```text
src/modules/shipping/
|-- controllers/shipping.controller.js
|-- services/shipping.service.js
|-- routes/shipping.routes.js
|-- models/
|   |-- shipment.model.js
|   `-- shipping-rate.model.js
|-- delhivery.provider.js
|-- shipping.events.js
|-- shipping.routes.js
`-- shipping.service.js
```

The flat shipping files are compatibility entry points.

### Coupon And Review

```text
src/modules/coupon/
|-- controllers/coupon.controller.js
|-- services/coupon.service.js
|-- routes/coupon.routes.js
`-- models/
    |-- coupon.model.js
    `-- coupon-usage.model.js

src/modules/review/
|-- controllers/review.controller.js
|-- services/review.service.js
|-- routes/review.routes.js
`-- models/review.model.js
```

### Analytics And Admin

```text
src/modules/analytics/
|-- routes/
|   `-- analytics.routes.js
`-- services/
    `-- analytics.service.js

src/modules/admin/
|-- controllers/
|   `-- admin.controller.js
|-- services/
|   |-- admin.service.js
|   `-- dashboard.service.js
|-- routes/
|   `-- admin.routes.js
`-- models/
    `-- admin-activity-log.model.js
```

## File Responsibilities

| Folder | Responsibility |
| --- | --- |
| `controllers/` | Express request handlers. They read `req`, call services, and send responses. |
| `services/` | Business logic, database coordination, provider calls, and reusable module operations. |
| `routes/` | Express routers. Keep these thin: middleware plus controller wiring. |
| `models/` | Mongoose schemas/models or database entities. |
| `validators/` | Request validation schemas and validation helpers. |
| `providers/` | External API adapters such as Google, Facebook, payment, shipping, or storage providers. |
| `dto/` | Request/response shape helpers used by routes or services. |

## Import Rules

Use layered imports for new code:

```js
import userRoutes from '@/modules/users/routes/user.routes.js';
import User from '@/modules/users/models/user.model.js';
import userService from '@/modules/users/services/user.service.js';
```

Avoid adding new imports to legacy flat files like:

```js
import userRoutes from '@/modules/users/user.routes.js';
```

Those files exist only to keep older code working during the migration.

## Naming Rules

- Use `.js` files only.
- Use native ES modules with `import` and `export`.
- Use `@/` imports for local source files.
- Keep module names singular where the new structure uses singular folders, such as `order`, `payment`, `review`, and `coupon`.
- Keep route files thin and put behavior in controllers/services.
- Put reusable cross-module code in `src/common`.
- Put infrastructure integrations in `src/infrastructure`.

## Migration Notes

- `src/routes/index.js` now imports from layered `routes/` folders.
- Several old flat files remain as compatibility re-exports while modules are migrated.
- The deleted plural module folders such as `orders`, `payments`, `reviews`, and `coupons` should not be used by new code.
- Scaffolded modules may have empty model/controller files until their schema and business logic are discussed and implemented.
