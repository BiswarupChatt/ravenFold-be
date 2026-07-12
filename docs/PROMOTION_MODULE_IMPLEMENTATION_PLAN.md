# Promotion Module Implementation Plan

## Phase 1 Goal

Implement the promotion system in a way that matches the current `ravenFold-be` backend instead of introducing a new architecture.

This backend is currently:

- Node.js with native ESM
- Express 5
- Mongoose
- JavaScript, not TypeScript
- Custom schema validation via `createSchema(...)` and `validate(...)`
- Service/controller/route modules with shared helpers in `src/common`

## Current Architecture Observations

### Routing and module pattern

- Global API registration happens in `src/routes/index.js`.
- Each module typically uses:
  - `controllers/`
  - `services/`
  - `routes/`
  - `models/`
  - optional validators in `*.validator.js` or `validators/`
- Response format uses `sendSuccess(...)` from `src/common/helpers/response.helper.js`.
- Async route wrapping uses `src/common/helpers/asyncHandler.helper.js`.

### Validation pattern

- The project does not use Joi or Zod.
- Request validation is handled with:
  - `src/common/middleware/validate.middleware.js`
  - `src/common/utils/request-schema.util.js`
- Promotion validators should follow the same pattern as:
  - `src/modules/cart/cart.validator.js`
  - `src/modules/order/order.validator.js`

### Auth and admin authorization

- Authentication middleware: `src/common/middleware/auth.middleware.js`
- Admin role middleware: `src/common/middleware/admin.middleware.js`
- Admin-only promotion CRUD should follow the same route protection style used in:
  - `src/modules/product/routes/product.routes.js`
  - `src/modules/inventory/routes/inventory.routes.js`

### Existing registry pattern to reuse

- Payment providers already use a registry:
  - `src/modules/payment/providers/payment-provider.registry.js`
- Promotion engines should follow the same style with a promotion engine registry instead of one large switch-heavy service.

## Existing Business Flow Relevant To Promotions

### Cart

Current cart implementation lives in:

- `src/modules/cart/models/cart.model.js`
- `src/modules/cart/models/cart-item.model.js`
- `src/modules/cart/services/cart.service.js`
- `src/modules/cart/routes/cart.routes.js`

Current facts:

- Cart totals currently only store:
  - `subtotal`
  - `itemCount`
  - `totalQuantity`
- `recalculateCartTotals(...)` only sums item totals.
- Cart items store product and price snapshots, but the snapshot does not currently include `categoryId`.
- There is no stored coupon code or applied promotion state on the cart yet.

### Checkout and order creation

Current order checkout flow lives in:

- `src/modules/order/services/order.service.js`
- `src/modules/order/models/order.model.js`
- `src/modules/order/models/order-item.model.js`

Current facts:

- Checkout uses the active cart and rebuilds order items from live product/variant data.
- `calculateTotals(...)` currently hardcodes:
  - `couponDiscount = 0`
  - `shippingCharge = 0`
- Orders are created before payment is settled.
- Inventory is reserved during checkout order creation.
- Cart is immediately moved to `converted`.

This means promotion recalculation must happen on the backend during checkout before the order is persisted.

### Payment and successful-order semantics

Current payment flow lives in:

- `src/modules/payment/services/payment.service.js`
- `src/modules/payment/models/payment-attempt.model.js`
- `src/modules/payment/models/payment.model.js`

Current facts:

- A successful payment changes:
  - `order.paymentStatus` to `paid`
  - `order.status` from `pending` to `confirmed`
- Failed payment does not mark the order as successful.

This is the correct baseline for:

- first-order eligibility
- promotion usage recording
- preventing usage creation during preview-only cart calculation

### Existing coupon module conflict

There is already a `coupon` module registered in `src/routes/index.js`, but it is only a placeholder:

- `src/modules/coupon/routes/coupon.routes.js`
- `src/modules/coupon/services/coupon.service.js`
- `src/modules/coupon/models/coupon.model.js` is empty
- `src/modules/coupon/models/coupon-usage.model.js` is empty

This creates an architecture conflict:

- either the coupon module must be replaced by the promotion module
- or coupon behavior must become a thin alias over the new promotion system

Recommended direction:

- keep `/promotions` as the main admin/customer promotion API
- move coupon logic into the promotion module
- either remove the placeholder coupon module later or make `/coupons` proxy promotion-backed coupon lookups without maintaining two separate data models

## Proposed Module Structure For This Repo

Use the existing backend’s JavaScript module pattern:

```txt
src/modules/promotion/
  controllers/
    promotion.controller.js

  services/
    promotion.service.js
    promotion-engine.service.js
    promotion-context.service.js

  engines/
    percentage-discount.engine.js
    fixed-discount.engine.js
    buy-x-get-y.engine.js
    free-shipping.engine.js
    category-discount.engine.js
    product-discount.engine.js
    coupon.engine.js
    first-order.engine.js
    new-user.engine.js
    cart-value.engine.js
    promotion-engine.registry.js

  models/
    promotion.model.js
    promotion-usage.model.js

  routes/
    promotion.routes.js

  validators/
    promotion.validator.js

  constants/
    promotion.constants.js
```

## Files To Create

### New promotion module

- `src/modules/promotion/controllers/promotion.controller.js`
- `src/modules/promotion/services/promotion.service.js`
- `src/modules/promotion/services/promotion-engine.service.js`
- `src/modules/promotion/services/promotion-context.service.js`
- `src/modules/promotion/engines/percentage-discount.engine.js`
- `src/modules/promotion/engines/fixed-discount.engine.js`
- `src/modules/promotion/engines/buy-x-get-y.engine.js`
- `src/modules/promotion/engines/free-shipping.engine.js`
- `src/modules/promotion/engines/category-discount.engine.js`
- `src/modules/promotion/engines/product-discount.engine.js`
- `src/modules/promotion/engines/coupon.engine.js`
- `src/modules/promotion/engines/first-order.engine.js`
- `src/modules/promotion/engines/new-user.engine.js`
- `src/modules/promotion/engines/cart-value.engine.js`
- `src/modules/promotion/engines/promotion-engine.registry.js`
- `src/modules/promotion/models/promotion.model.js`
- `src/modules/promotion/models/promotion-usage.model.js`
- `src/modules/promotion/routes/promotion.routes.js`
- `src/modules/promotion/validators/promotion.validator.js`
- `src/modules/promotion/constants/promotion.constants.js`

### Config and docs

- `src/config/promotion.config.js`
- `docs/PROMOTION_MODULE.md`

### Tests

- one test file per engine under the promotion module
- one or more promotion integration tests under the same native `node:test` style already used in payment tests

## Files To Update

### Global route registration

- `src/routes/index.js`
  - register `promotion.routes.js`
  - decide whether to keep or remove the placeholder `/coupons` route

### Cart module

- `src/modules/cart/routes/cart.routes.js`
  - add:
    - `POST /cart/calculate`
    - `POST /cart/apply-coupon`
    - `POST /cart/remove-coupon`
- `src/modules/cart/controllers/cart.controller.js`
- `src/modules/cart/services/cart.service.js`
  - integrate promotion calculation
  - return normalized promotion result in cart responses
- `src/modules/cart/cart.validator.js`
  - add request schemas for calculate/apply/remove coupon
- `src/modules/cart/models/cart.model.js`
  - likely add coupon/application state if coupon persistence is required between calls

### Cart and order item snapshots

- `src/modules/cart/models/cart-item.model.js`
- `src/modules/order/models/order-item.model.js`
- `src/modules/cart/services/cart.service.js`
- `src/modules/order/services/order.service.js`

Reason:

- category-based and product-based promotion evaluation will be cleaner if snapshots include:
  - `categoryId`
  - possibly `requiresShipping` or shipping eligibility fields if needed

### Order module

- `src/modules/order/models/order.model.js`
  - add applied promotion snapshot fields
- `src/modules/order/services/order.service.js`
  - replace hardcoded `couponDiscount = 0`
  - recalculate promotions during checkout
  - persist promotion snapshot on the order
- `src/modules/order/order.validator.js`
  - possibly accept coupon code during checkout if checkout payload should carry it

### Payment / post-success usage recording

- `src/modules/payment/services/payment.service.js`

Reason:

- `PromotionUsage` should be created only when the order reaches the successful stage.
- The cleanest current hook is the existing payment success transition where:
  - `paymentStatus` becomes `paid`
  - `order.status` becomes `confirmed`

### Environment config

- `src/config/env.config.js`
  - add new-user eligibility and any promotion config envs

## Data Model Changes Expected

### Promotion model

Use a Mongoose model aligned with current conventions:

- uppercase coupon codes in storage
- enum strings in constants
- indexes declared on the schema
- `timestamps: true`
- `versionKey: false`

Likely fields:

- `title`
- `description`
- `type`
- `applicableOn`
- `productIds`
- `categoryIds`
- `couponCode`
- `discountValue`
- `discountMethod`
- `maxDiscountAmount`
- `minOrderAmount`
- `buyQuantity`
- `getQuantity`
- `usageLimit`
- `perUserLimit`
- `usedCount`
- `priority`
- `isStackable`
- `isAutomatic`
- `isActive`
- `startDate`
- `endDate`
- `createdBy`

### Promotion usage model

Likely fields:

- `promotionId`
- `userId`
- `orderId`
- `couponCode`
- `discountAmount`
- `shippingDiscountAmount`
- `usedAt`

### Order model additions

Recommended additions:

- `appliedPromotions: []`
- possibly `productDiscountAmount`
- possibly `shippingDiscountAmount`
- possibly `couponCode`

Right now only `couponDiscount` exists, which is too narrow for the requested engine types.

## Key Design Decisions For RavenFold

### 1. Keep calculations server-side only

Frontend should only send:

- coupon code
- cart/order intent

The backend must always load live pricing and compute:

- eligible subtotal
- product discount
- shipping discount
- final total

### 2. Use a promotion context builder

This repo currently rebuilds cart/order pricing from live product and variant data. The promotion engine should do the same via a shared context builder rather than reading raw request data directly.

Recommended context inputs:

- active cart items
- live products
- live variants
- category ids from live products
- user created date
- count of successful orders
- shipping charge from current calculation flow

### 3. Reuse registry pattern

Use:

- `promotion-engine.registry.js`

similar to:

- `payment-provider.registry.js`

This matches the existing architecture and avoids a monolithic `promotion.service.js`.

### 4. Define successful order eligibility centrally

For first-order and usage creation, use one shared rule:

- successful order means `paymentStatus === paid`
- and order should not be `cancelled`

This should be implemented in one shared helper to avoid drift between:

- first-order eligibility
- usage creation
- reporting

### 5. Do not rely on current shipping charge behavior

Current checkout uses `shippingCharge = 0`.

Implication:

- `FREE_SHIPPING` can still be implemented correctly
- but it may return zero shipping discount until real shipping charge calculation is part of checkout/cart totals

This should be documented explicitly rather than hidden.

## Known Risks And Conflicts

### Coupon duplication risk

There must not be:

- one standalone coupon engine
- plus a second unrelated coupon module

The placeholder `coupon` module should not evolve into a competing source of truth.

### Cart persistence decision

The current cart model does not store:

- coupon code
- applied promotions

Decision needed during implementation:

- either treat `/cart/calculate` as stateless preview
- or persist selected coupon/application state onto the cart

Recommended direction:

- persist `couponCode` on cart
- always recalculate server-side
- never persist raw discount amounts on cart as trusted source data

### Usage creation timing

The instruction says usage should be created only at the successful stage.

In this repo, that should be tied to payment success, not checkout order creation.

### Transactions may be limited

The current codebase does not show existing use of Mongoose sessions/transactions.

Implication:

- if MongoDB deployment supports transactions, use them for:
  - order success promotion usage writes
  - `usedCount` updates
- otherwise use idempotent uniqueness constraints and careful write ordering

## Recommended Implementation Order

1. Create promotion constants, config, models, and validators
2. Build promotion context service and engine registry
3. Implement each promotion engine with unit tests
4. Implement central conflict resolution and normalized response shape
5. Integrate cart calculation endpoints and cart response formatting
6. Integrate checkout recalculation and order promotion snapshot storage
7. Integrate payment-success promotion usage recording
8. Register routes and admin CRUD
9. Add integration tests and module documentation

## First Practical Build Target

Before the full admin UI exists, the backend should be able to do all of the following:

- create a promotion from admin API
- list active promotions
- calculate cart totals with or without coupon code
- return applied promotions and rejected coupon reason
- recalculate during checkout
- store promotion snapshot on the created order
- create usage records only after successful payment confirmation

## Immediate Next Implementation Step

Phase 2 should start with:

1. `promotion.constants.js`
2. `promotion.config.js`
3. `promotion.model.js`
4. `promotion-usage.model.js`
5. `promotion.validator.js`

That gives the rest of the engine and cart integration work a stable schema foundation.
