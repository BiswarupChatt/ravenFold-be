# Cron Jobs TODO

## Goal

Create a single backlog for all scheduled or background jobs that should exist in `ravenFold-be` but are not implemented yet.

This project already has webhook and manual-sync paths for some flows. The jobs below are intended as fallback automation, consistency repair, or lifecycle cleanup.

## Current Gaps

- Shipment tracking updates depend on provider webhook delivery or admin manual refresh.
- Payment status recovery exists per attempt, but there is no scheduler to reconcile stale pending attempts automatically.
- Refund status sync is still pending.
- Cart abandonment is not automated.
- Checkout currently creates orders and reserves inventory before payment is fully settled, so stale unpaid orders need a timed cleanup path.

## Job 1: Shipment Tracking Fallback Sync

- Purpose: keep shipment progress updated even when provider webhooks are delayed, missed, or incomplete.
- Relevant code:
  - `src/modules/shipping/routes/shipping.routes.js`
  - `src/modules/shipping/services/shipping.service.js`
  - `src/modules/shipping/providers/shiprocket.provider.js`
  - `src/modules/shipping/providers/delhivery.provider.js`
- Suggested trigger:
  - `ENABLE_SHIPMENT_TRACKING_JOBS=true`
  - `SHIPMENT_TRACKING_SYNC_INTERVAL_MS=900000`
- Scope:
  - Find shipments in active statuses such as `provider_order_created`, `label_created`, `pickup_scheduled`, `picked_up`, `in_transit`, and `out_for_delivery`.
  - Skip terminal shipment statuses such as `delivered`, `cancelled`, `lost`, and `rto`.
  - Skip providers that do not support tracking refresh.
- Job steps:
  - Load active shipments in batches.
  - Call the provider `trackShipment` path already used by admin manual sync.
  - Persist latest shipment status, provider status, tracking URL, timestamps, and timeline events.
  - Let shipment sync continue updating `Order.status` through the existing backend flow.
- Extra safeguards:
  - Add per-provider rate limiting or batch throttling.
  - Store `lastSyncedAt` and avoid re-syncing too aggressively.
  - Log failed sync attempts with shipment id and provider.

## Job 2: Payment Attempt Reconciliation

- Purpose: resolve stale payment attempts automatically when storefront verification or provider webhook does not complete the update.
- Relevant code:
  - `src/modules/payment/services/payment.service.js`
  - `src/modules/payment/providers/razorpay.provider.js`
  - `src/modules/payment/providers/juspay.provider.js`
  - `src/modules/payment/routes/payment.routes.js`
- Suggested trigger:
  - `ENABLE_PAYMENT_RECONCILIATION_JOBS=true`
  - `PAYMENT_RECONCILIATION_INTERVAL_MS=300000`
- Scope:
  - Find payment attempts in `created`, `pending`, or possibly `authorized` state.
  - Ignore attempts already finalized as `paid`, `failed`, or `cancelled`.
- Job steps:
  - Load pending payment attempts in small batches.
  - For each provider, call `fetchPaymentStatus` where supported.
  - Apply the result through the same state transition logic used by the API flow.
  - Update `PaymentAttempt`, `Order.paymentStatus`, `Order.paymentFailureReason`, and `Payment` records when needed.
- Extra safeguards:
  - Add an attempt age window so brand-new attempts are not polled too early.
  - Record the last reconciliation timestamp to reduce noisy polling.
  - Keep webhook as the primary source; this job is fallback reconciliation.

## Job 3: Refund Status Sync

- Purpose: finish the refund lifecycle after provider acceptance.
- Relevant code:
  - `src/modules/payment/services/refund.service.js`
  - `src/modules/payment/models/refund.model.js`
  - `src/modules/payment/models/payment.model.js`
- Suggested trigger:
  - `ENABLE_REFUND_SYNC_JOBS=true`
  - `PAYMENT_REFUND_SYNC_INTERVAL_MS=300000`
- Scope:
  - Find refunds in `pending`.
  - Skip already finalized refunds.
- Job steps:
  - Query provider refund status.
  - Update `Refund.status`, provider response details, and failure reason.
  - Recalculate `Payment.refundedAmount` and payment record status.
  - Update `Order.paymentStatus` to `partially_refunded` or `refunded` where appropriate.
- Note:
  - This is already listed in `docs/PAYMENT_TODO.md`, but it should also live in the central cron-job backlog.

## Job 4: Unpaid Order Expiry and Inventory Release

- Purpose: release inventory and close stale orders that were created from checkout but never paid successfully.
- Why this matters:
  - `createCheckoutOrder` currently creates the order, inserts order items, reserves inventory, and converts the cart before payment is fully settled.
  - Without cleanup, stale unpaid orders can hold inventory indefinitely.
- Relevant code:
  - `src/modules/order/services/order.service.js`
  - `src/modules/payment/services/payment.service.js`
  - `src/modules/inventory/services/inventory.service.js`
- Suggested trigger:
  - `ENABLE_UNPAID_ORDER_EXPIRY_JOBS=true`
  - `UNPAID_ORDER_EXPIRY_INTERVAL_MS=900000`
  - `UNPAID_ORDER_EXPIRY_MINUTES=30`
- Scope:
  - Target orders where:
    - `order.status === pending`
    - `order.paymentStatus === pending` or `failed`
    - order age is older than the configured expiry threshold
  - Skip orders already paid, shipped, cancelled, or returned.
- Job steps:
  - Find stale unpaid orders in batches.
  - Release reserved inventory for their order items.
  - Mark the order as expired or cancelled based on the final business decision.
  - Append order history explaining that the system expired the unpaid order.
  - Decide whether a converted cart should stay converted, be reopened, or be rebuilt.
- Open decision:
  - You need to decide whether these expired unpaid orders should become `cancelled`, a new status like `payment_expired`, or remain hidden from the storefront.

## Job 5: Cart Abandonment Automation

- Purpose: automatically mark stale carts as abandoned.
- Relevant code:
  - `src/modules/cart/*`
  - Existing note in `docs/CART_TODO.md`
- Suggested trigger:
  - `ENABLE_CART_ABANDONMENT_JOBS=true`
  - `CART_ABANDONMENT_INTERVAL_MS=3600000`
  - `CART_ABANDONMENT_AGE_DAYS=7`
- Scope:
  - Find carts still marked `active` after the chosen inactivity window.
  - Skip carts already `converted` or already `abandoned`.
- Job steps:
  - Move stale carts from `active` to `abandoned`.
  - Decide whether related analytics or notification hooks should be triggered later.

## Job 6: Data Consistency Audit Job

- Purpose: detect and optionally repair mismatches between orders, payments, refunds, and shipments.
- Suggested trigger:
  - `ENABLE_CONSISTENCY_AUDIT_JOBS=true`
  - `CONSISTENCY_AUDIT_INTERVAL_MS=21600000`
- Examples to detect:
  - shipment delivered but `Order.status` not delivered
  - `Order.paymentStatus === paid` but no `Payment` record exists
  - `Refund.status` finalized but `Payment.refundedAmount` is stale
  - active shipment exists but order is still `pending` after payment success
  - order is cancelled while shipment is still active
- Recommended behavior:
  - Start as report-only.
  - Save findings to logs or an audit collection first.
  - Add auto-repair only after validating the patterns.

## Suggested Implementation Order

1. Unpaid order expiry and inventory release
2. Shipment tracking fallback sync
3. Payment attempt reconciliation
4. Refund status sync
5. Cart abandonment automation
6. Data consistency audit job

## Suggested Shared Infrastructure

- Create one background jobs bootstrap entry such as `src/jobs/index.js`.
- Add one scheduler module per domain:
  - `src/jobs/shipment-tracking.job.js`
  - `src/jobs/payment-reconciliation.job.js`
  - `src/jobs/refund-sync.job.js`
  - `src/jobs/unpaid-order-expiry.job.js`
  - `src/jobs/cart-abandonment.job.js`
  - `src/jobs/consistency-audit.job.js`
- Run every job behind env flags.
- Add batch size env vars for every job.
- Add structured logs for start, finish, records processed, records updated, and failures.
- Make every job idempotent so it is safe to rerun.

## Testing Checklist For Later

- Unit tests for each scheduler filter and status transition.
- Integration tests for inventory release on expired unpaid orders.
- Integration tests for shipment sync updating customer-visible tracking states.
- Integration tests for payment reconciliation after missed webhook delivery.
- Integration tests for refund reconciliation changing `Order.paymentStatus`.
- Failure-path tests for provider errors, partial batch failures, and retry behavior.
