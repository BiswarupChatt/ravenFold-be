# Payment TODO

- Add refund status sync job.
  - Run behind env flags such as `ENABLE_PAYMENT_JOBS=true` and `PAYMENT_REFUND_SYNC_INTERVAL_MS=300000`.
  - Find pending refunds and fetch latest provider status.
  - Update `Refund.status`, `Refund.processedAt`, and failure reason when applicable.
  - Update `Payment.refundedAmount` and `Payment.status`.
  - Update `Order.paymentStatus` to `partially_refunded` or `refunded` after provider confirms the refund.
  - Keep admin manual sync as an optional later action.
