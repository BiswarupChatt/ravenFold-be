# RavenFold Backend Folder Structure

This document describes the planned JavaScript backend structure for the RavenFold ecommerce API. The original reference structure used TypeScript files, but this project uses native ES modules, so every `.ts` file maps to a `.js` file with `import` and `export` syntax.

The goal is a modular backend where each ecommerce domain owns its own routes, controller, service, repository, validation, model, events, and supporting providers.

## Planned JavaScript Structure

```text
backend/
|-- package.json
|-- package-lock.json
|-- jsconfig.json
|-- .env
|-- .env.example
|-- .gitignore
|-- README.md
|-- docker-compose.yml
|-- docs/
|   |-- FOLDER_STRUCTURE.md
|   `-- swagger.js
|-- tests/
|   |-- unit/
|   |-- integration/
|   `-- e2e/
|-- uploads/
`-- src/
    |-- app.js
    |-- server.js
    |-- loaders/
    |   |-- alias-loader.js
    |   `-- alias-register.js
    |-- config/
    |   |-- env.config.js
    |   |-- db.config.js
    |   |-- redis.config.js
    |   |-- razorpay.config.js
    |   |-- aws.config.js
    |   `-- delhivery.config.js
    |-- common/
    |   |-- constants/
    |   |   |-- roles.constant.js
    |   |   |-- order.constant.js
    |   |   `-- app.constant.js
    |   |-- errors/
    |   |   |-- app.error.js
    |   |   |-- api.error.js
    |   |   `-- error.handler.js
    |   |-- middleware/
    |   |   |-- auth.middleware.js
    |   |   |-- admin.middleware.js
    |   |   |-- rateLimit.middleware.js
    |   |   `-- validate.middleware.js
    |   |-- utils/
    |   |   |-- jwt.util.js
    |   |   |-- otp.util.js
    |   |   |-- pagination.util.js
    |   |   |-- slug.util.js
    |   |   `-- price.util.js
    |   |-- logger/
    |   |   |-- logger.js
    |   |   `-- morgan.logger.js
    |   `-- helpers/
    |       |-- response.helper.js
    |       `-- asyncHandler.helper.js
    |-- infrastructure/
    |   |-- database/
    |   |   `-- mongodb.js
    |   |-- redis/
    |   |   `-- redis.js
    |   |-- queues/
    |   |   |-- bullmq.js
    |   |   |-- email.queue.js
    |   |   |-- notification.queue.js
    |   |   `-- order.queue.js
    |   |-- storage/
    |   |   |-- s3.service.js
    |   |   `-- cloudfront.service.js
    |   `-- events/
    |       |-- eventBus.js
    |       `-- events.js
    |-- modules/
    |   |-- auth/
    |   |-- users/
    |   |-- products/
    |   |-- inventory/
    |   |-- cart/
    |   |-- wishlist/
    |   |-- orders/
    |   |-- payments/
    |   |-- shipping/
    |   |-- reviews/
    |   |-- coupons/
    |   |-- notifications/
    |   |-- analytics/
    |   `-- admin/
    `-- routes/
        |-- index.js
        `-- admin.routes.js
```

## Root Files

| Path | Purpose |
| --- | --- |
| `package.json` | Project metadata, npm scripts, dependencies, and dev dependencies. |
| `jsconfig.json` | Editor path mapping for `@/*` imports. |
| `.env` | Local environment variables. This file should not be committed. |
| `.env.example` | Safe template showing required environment variable names. |
| `.gitignore` | Keeps `node_modules`, `.env`, logs, uploads, and build artifacts out of git. |
| `docker-compose.yml` | Local service orchestration, usually for MongoDB, Redis, and supporting services. |
| `README.md` | Project overview, setup commands, scripts, and links to documentation. |

## `src/app.js`

`src/app.js` owns Express app configuration:

- create the Express app
- register security middleware such as `helmet`
- register CORS
- register JSON/body parsers
- register request logging
- mount API routes
- mount not-found and error handlers

It should not open the network port. That responsibility belongs to `src/server.js`.

## `src/server.js`

Process entry point used by the npm scripts.

Responsibilities:

- load environment variables
- connect to MongoDB
- connect to Redis if required
- start the HTTP server
- handle graceful shutdown

## `src/loaders`

Node runtime loader support for `@/` imports.

Recommended files:

- `alias-loader.js`: maps `@/` to the `src/` directory
- `alias-register.js`: registers the loader through Node's `--import` flag

## `src/config`

Configuration files convert environment variables into clean config objects that the rest of the app can import.

Recommended files:

- `env.config.js`: reads and validates base env values like `NODE_ENV`, `PORT`, JWT secrets, frontend URL, and API base URL
- `db.config.js`: MongoDB URI, database name, connection options
- `redis.config.js`: Redis host, port, password, TLS settings
- `razorpay.config.js`: Razorpay key ID, key secret, webhook secret
- `aws.config.js`: AWS region, S3 bucket, access keys, CloudFront domain
- `delhivery.config.js`: Delhivery base URL, token, warehouse/pickup config

Rule: application code should not read `process.env` directly outside config files.

## `src/common`

Shared code used across multiple modules.

### `common/constants`

Project-wide constants that should not be duplicated inside modules.

Examples:

- `roles.constant.js`: `CUSTOMER`, `ADMIN`, `SUPER_ADMIN`
- `order.constant.js`: order statuses, payment statuses, shipment statuses
- `app.constant.js`: common limits, default pagination values, app names

### `common/errors`

Reusable error classes and centralized error handling.

Examples:

- `app.error.js`: base application error class
- `api.error.js`: HTTP-aware errors with status codes
- `error.handler.js`: Express error middleware

### `common/middleware`

Express middleware shared by many routes.

Examples:

- `auth.middleware.js`: verifies JWT and attaches the logged-in user to `req`
- `admin.middleware.js`: checks admin roles/permissions
- `rateLimit.middleware.js`: protects sensitive routes from abuse
- `validate.middleware.js`: runs request validation schemas before controllers

### `common/utils`

Small pure helpers that do not depend on Express.

Examples:

- `jwt.util.js`: sign and verify JWTs
- `otp.util.js`: generate and verify OTPs
- `pagination.util.js`: build skip/limit/page metadata
- `slug.util.js`: generate SEO-friendly slugs
- `price.util.js`: currency and price calculations

### `common/logger`

Logging setup.

Examples:

- `logger.js`: app logger, usually Winston or Pino
- `morgan.logger.js`: HTTP request logger integration

### `common/helpers`

Express and API response helpers.

Examples:

- `response.helper.js`: standard success response shape
- `asyncHandler.helper.js`: wraps async controllers and forwards errors to Express

## `src/infrastructure`

Infrastructure code integrates with databases, queues, storage, and event systems. Business modules should call infrastructure through services, not scatter SDK setup everywhere.

### `infrastructure/database`

Database connection layer.

- `mongodb.js`: connects Mongoose or MongoDB driver and manages connection lifecycle

### `infrastructure/redis`

Redis connection setup.

- `redis.js`: exports a Redis client or factory

### `infrastructure/queues`

Background job infrastructure.

Examples:

- `bullmq.js`: shared BullMQ connection and queue helpers
- `email.queue.js`: email jobs
- `notification.queue.js`: push/SMS/email notification jobs
- `order.queue.js`: order lifecycle jobs

### `infrastructure/storage`

File and media storage services.

Examples:

- `s3.service.js`: upload/delete/read files from S3
- `cloudfront.service.js`: signed URLs or CDN URL helpers

### `infrastructure/events`

Internal application events.

Examples:

- `eventBus.js`: central event emitter or pub/sub adapter
- `events.js`: shared event names such as `ORDER_CREATED`, `PAYMENT_CAPTURED`, `INVENTORY_LOW`

## `src/modules`

Each module owns one business domain. A module should contain its own route definitions, controller, service, repository, validation, model, events, providers, and DTO/request-shape files where needed.

Common module file roles:

| File Pattern | Purpose |
| --- | --- |
| `*.routes.js` | Express route definitions for the module. |
| `*.controller.js` | HTTP layer. Reads request data, calls services, returns responses. |
| `*.service.js` | Business logic. Coordinates repositories, providers, events, and queues. |
| `*.repository.js` | Data access layer. Talks to Mongoose models or database clients. |
| `*.model.js` | Mongoose schema/model or database entity definition. |
| `*.validation.js` | Request validation schemas, usually Joi or Zod. |
| `*.events.js` | Event publishers and event handlers for the module. |
| `providers/` | External service adapters used by the module. |
| `services/` | Internal sub-services for complex module-specific logic. |
| `dto/` | Request/response shape helpers. In JS, these are usually validation-aligned shape files, not TypeScript types. |

### Auth Module

Handles login, registration, OTP, social login, token refresh, logout, and password/account security.

Suggested files:

```text
src/modules/auth/
|-- auth.controller.js
|-- auth.service.js
|-- auth.repository.js
|-- auth.routes.js
|-- auth.validation.js
|-- auth.events.js
|-- providers/
|   |-- google.provider.js
|   |-- apple.provider.js
|   `-- facebook.provider.js
`-- dto/
    |-- login.dto.js
    `-- verifyOtp.dto.js
```

### Users Module

Handles customer profiles, addresses, account status, and admin user management.

Suggested files:

```text
src/modules/users/
|-- user.model.js
|-- user.controller.js
|-- user.service.js
|-- user.repository.js
|-- user.routes.js
|-- user.validation.js
`-- dto/
```

### Products Module

Handles products, variants, images, categories, product search, and catalog management.

Suggested files:

```text
src/modules/products/
|-- product.model.js
|-- productVariant.model.js
|-- product.controller.js
|-- product.service.js
|-- product.repository.js
|-- product.routes.js
|-- product.validation.js
|-- product.events.js
|-- dto/
|   |-- createProduct.dto.js
|   `-- updateProduct.dto.js
`-- services/
    |-- pricing.service.js
    `-- inventorySync.service.js
```

### Inventory Module

Tracks stock levels, reservations, restocks, low-stock events, and inventory movements.

Suggested files:

```text
src/modules/inventory/
|-- inventory.model.js
|-- inventory.service.js
|-- inventory.repository.js
|-- inventory.events.js
`-- inventory.routes.js
```

### Cart Module

Handles cart creation, item add/remove/update, cart totals, and guest/authenticated cart behavior.

Suggested files:

```text
src/modules/cart/
|-- cart.model.js
|-- cart.service.js
|-- cart.repository.js
`-- cart.routes.js
```

### Wishlist Module

Handles customer saved products.

Suggested files:

```text
src/modules/wishlist/
|-- wishlist.model.js
|-- wishlist.service.js
`-- wishlist.routes.js
```

### Orders Module

Handles checkout, order creation, order status changes, cancellations, refunds, and order history.

Suggested files:

```text
src/modules/orders/
|-- order.model.js
|-- orderItem.model.js
|-- order.controller.js
|-- order.service.js
|-- order.repository.js
|-- order.routes.js
|-- order.validation.js
|-- order.events.js
|-- services/
|   |-- orderPricing.service.js
|   |-- orderTax.service.js
|   `-- orderStatus.service.js
`-- dto/
```

### Payments Module

Handles payment orders, payment verification, webhook processing, refunds, and payment provider adapters.

Suggested files:

```text
src/modules/payments/
|-- payment.model.js
|-- payment.controller.js
|-- payment.service.js
|-- payment.repository.js
|-- payment.routes.js
|-- payment.webhook.js
|-- payment.validation.js
`-- providers/
    |-- razorpay.provider.js
    `-- stripe.provider.js
```

### Shipping Module

Handles shipment creation, courier integration, tracking, delivery status updates, and shipping events.

Suggested files:

```text
src/modules/shipping/
|-- shipping.service.js
|-- shipping.routes.js
|-- delhivery.provider.js
`-- shipping.events.js
```

### Reviews Module

Handles product reviews, ratings, moderation, and review validation.

Suggested files:

```text
src/modules/reviews/
|-- review.model.js
|-- review.service.js
|-- review.routes.js
`-- review.validation.js
```

### Coupons Module

Handles discount codes, usage limits, validation, expiry, and coupon application.

Suggested files:

```text
src/modules/coupons/
|-- coupon.model.js
|-- coupon.service.js
`-- coupon.routes.js
```

### Notifications Module

Handles customer notifications through email, SMS, push, and internal events.

Suggested files:

```text
src/modules/notifications/
|-- notification.service.js
|-- email.service.js
|-- sms.service.js
|-- push.service.js
`-- notification.events.js
```

### Analytics Module

Handles admin-facing reporting, sales metrics, product metrics, and operational analytics.

Suggested files:

```text
src/modules/analytics/
|-- analytics.service.js
|-- analytics.routes.js
`-- analytics.events.js
```

### Admin Module

Handles admin-only workflows and dashboard aggregation.

Suggested files:

```text
src/modules/admin/
|-- admin.routes.js
|-- admin.service.js
`-- dashboard.service.js
```

## `src/routes`

Global route composition lives here.

Recommended files:

- `index.js`: mounts public module routes under `/api`
- `admin.routes.js`: mounts admin module routes under `/api/admin`

Example responsibility:

```js
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
```

## `tests`

Tests should mirror the application structure.

Recommended layout:

- `tests/unit`: isolated service, utility, and repository tests
- `tests/integration`: route + database integration tests
- `tests/e2e`: full API flows such as register -> login -> add to cart -> checkout

## `uploads`

Temporary local file storage for development. Production uploads should go to S3 or another object storage provider.

Rules:

- do not commit uploaded files
- keep upload validation strict
- prefer storing only metadata in MongoDB

## Naming Rules

- Use `.js` files, not `.ts`.
- Use native ES modules while `package.json` has `"type": "module"`.
- Use `@/` imports for local application files, for example `@/common/errors/api.error.js`.
- Use kebab-free, domain-first names like `product.service.js`, `order.routes.js`, and `auth.controller.js`.
- Keep route files thin.
- Keep controllers HTTP-focused.
- Keep services responsible for business rules.
- Keep repositories responsible for database access.
- Keep providers responsible for third-party API integration.
- Keep shared utilities in `common`, not inside individual modules.

## Recommended Build Order

1. Stabilize base app structure: `app.js`, env config, global error handling, response helper, async handler.
2. Add database connection and user model.
3. Build auth and users.
4. Build products and inventory.
5. Build cart and wishlist.
6. Build orders.
7. Build payments and webhooks.
8. Build shipping.
9. Build reviews, coupons, notifications, analytics, and admin dashboard.
10. Add tests around each module as it becomes functional.


