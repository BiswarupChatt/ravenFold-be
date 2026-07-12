# Review Module

## Overview

The review module is implemented across `ravenFold-be`, `ravenFold-fe`, and `ravenFold-admin` with order-item level verification, admin moderation, public review summaries, and delayed reminder scheduling.

Core rules:

- A customer can review only an order item they purchased.
- The parent order must be delivered.
- One review is allowed per `userId + orderItemId`.
- New and edited reviews always return to `PENDING`.
- Only `APPROVED` reviews are shown publicly and counted in product ratings.
- Review reminder scheduling is idempotent and processed asynchronously.

## Backend Structure

- `src/modules/review/models/review.model.js`
- `src/modules/review/models/review-reminder.model.js`
- `src/modules/review/controllers/review.controller.js`
- `src/modules/review/controllers/admin-review.controller.js`
- `src/modules/review/routes/review.routes.js`
- `src/modules/review/routes/admin-review.routes.js`
- `src/modules/review/services/review.service.js`
- `src/modules/review/services/review-eligibility.service.js`
- `src/modules/review/services/review-rating.service.js`
- `src/modules/review/services/review-reminder.service.js`
- `src/modules/review/services/review-reminder.job.js`
- `src/modules/review/review.constants.js`
- `src/modules/review/review.validator.js`

## Review Model

Stored fields:

- `userId`
- `productId`
- `variantId`
- `orderId`
- `orderItemId`
- `rating`
- `title`
- `comment`
- `images`
- `status`
- `isVerifiedPurchase`
- `adminNote`
- `moderatedBy`
- `moderatedAt`
- `approvedAt`
- `rejectedAt`
- `hiddenAt`
- `deletedAt`
- `deletedBy`
- `createdAt`
- `updatedAt`

Important indexes:

- unique partial index on `userId + orderItemId` where `deletedAt: null`
- `productId + status + deletedAt + createdAt`
- `orderId + deletedAt`
- `orderItemId + deletedAt`
- `status + createdAt`

## Reminder Model

Stored fields:

- `userId`
- `orderId`
- `orderItemId`
- `productId`
- `variantId`
- `deliveredAt`
- `scheduledFor`
- `status`
- `attemptCount`
- `lastAttemptAt`
- `sentAt`
- `failedAt`
- `failureReason`
- `skipReason`

Important constraint:

- unique index on `orderItemId`

## Customer APIs

Mounted under `/api/reviews`:

- `GET /status`
- `GET /products/:productId/summary`
- `GET /products/:productId`
- `POST /uploads/cloudinary-signature`
- `GET /eligibility`
- `GET /my`
- `POST /`
- `PATCH /:reviewId`
- `DELETE /:reviewId`

### Review Create Payload

```json
{
  "orderId": "ORDER_ID",
  "orderItemId": "ORDER_ITEM_ID",
  "productId": "PRODUCT_ID",
  "variantId": "VARIANT_ID",
  "rating": 5,
  "title": "Excellent product",
  "comment": "The quality is very good and the product matches the images.",
  "images": []
}
```

Server-controlled fields:

- `userId`
- `status`
- `isVerifiedPurchase`
- moderation metadata

## Admin APIs

Mounted under `/api/admin/reviews`:

- `GET /`
- `GET /:reviewId`
- `PATCH /:reviewId/approve`
- `PATCH /:reviewId/reject`
- `PATCH /:reviewId/hide`
- `PATCH /:reviewId/restore`
- `DELETE /:reviewId`

## Eligibility Flow

The eligibility service validates:

1. Authenticated user id
2. Exact order existence
3. Order ownership
4. Exact order item presence
5. Product match
6. Variant match when provided
7. Delivered order status
8. Non-refunded and non-cancelled state
9. Product still exists
10. No existing non-deleted review for the same order item

Reason codes are returned in API responses, with a user-facing `reasonMessage` companion.

## Moderation Workflow

- Customer create: `PENDING`
- Customer edit: reset to `PENDING`
- Admin approve: `APPROVED`
- Admin reject: `REJECTED`
- Admin hide: `HIDDEN`
- Admin restore: `HIDDEN -> APPROVED`

Rating recalculation runs whenever an approved review enters or leaves the public set.

## Public Visibility Rules

Public review APIs return only:

- `status === APPROVED`
- `deletedAt === null`

Public responses do not expose:

- customer email
- customer phone
- full order identifiers
- admin notes
- moderation actor metadata

## Rating Summary Strategy

Strategy used: store the rating summary on `Product`, but always recalculate from approved reviews instead of manually incrementing counters.

Stored product fields:

- `averageRating`
- `reviewCount`
- `ratingDistribution`

## Reminder Scheduling

When an order becomes delivered:

1. Each order item is inspected.
2. Existing reviews are skipped.
3. `ReviewReminder.updateOne(..., { upsert: true })` creates one reminder row per order item.
4. `scheduledFor = deliveredAt + REVIEW_REMINDER_DELAY_DAYS`

## Reminder Processing

Bootstrap:

- `src/background-jobs.js`
- `src/server.js`

Worker behavior:

1. Runs on `REVIEW_REMINDER_JOB_INTERVAL_MS`
2. Claims reminders atomically with `findOneAndUpdate`
3. Revalidates customer, order, item, product, and review state
4. Marks each reminder as `SENT`, `FAILED`, or `SKIPPED`
5. Stops retrying after `REVIEW_REMINDER_MAX_ATTEMPTS`

## Duplicate Prevention

The module prevents duplicate reminders with:

- unique index on `orderItemId`
- idempotent upsert at schedule time
- atomic reminder claiming
- terminal `SENT` and `SKIPPED` statuses
- existing-review recheck before send

## Review Reminder Email

Current mode:

- `REVIEW_REMINDER_EMAIL_MODE=log`

Current behavior:

- generates the final payload and logs it through the backend logger
- does not yet connect to a real outbound email provider

Review link format:

- `${FRONTEND_URL}/profile/reviews/write/{orderId}/{orderItemId}`

## Frontend Integration

### Storefront

- PDP review summary and approved reviews in `ravenFold-fe/src/pages/shop/product/ProductDetails.jsx`
- PDP review section in `ravenFold-fe/src/pages/shop/product/components/sections/ProductReviewsSection.jsx`
- order-level write/edit review flow in `ravenFold-fe/src/pages/profile/subPages/order/Order.jsx`
- customer review management in `ravenFold-fe/src/pages/profile/subPages/reviews/Reviews.jsx`

### Admin

- review moderation list in `ravenFold-admin/src/pages/other/review/Review.jsx`
- review detail and action dialog in `ravenFold-admin/src/pages/other/review/ReviewDetailsDialog.jsx`

## Environment Variables

- `CLOUDINARY_REVIEW_UPLOAD_FOLDER`
- `ENABLE_REVIEW_REMINDER_JOBS`
- `REVIEW_REMINDER_DELAY_DAYS`
- `REVIEW_REMINDER_JOB_INTERVAL_MS`
- `REVIEW_REMINDER_MAX_ATTEMPTS`
- `REVIEW_REMINDER_BATCH_SIZE`
- `REVIEW_REMINDER_EMAIL_MODE`

## Tests Added

- review constants message coverage
- review payload validator coverage
- rating summary formatter coverage

## Current Limitations

- Reminder delivery is implemented as job processing plus logged payloads; a real email transport still needs to be connected.
- The current automated tests are unit-level. End-to-end DB-backed moderation and reminder processing tests still need to be added later.
