import unpaidOrderExpiryJob from '@/modules/order/services/unpaid-order-expiry.job.js';
import paymentReconciliationJob from '@/modules/payment/services/payment-reconciliation.job.js';
import reviewReminderJob from '@/modules/review/services/review-reminder.job.js';

const stopHandlers = [];

const startBackgroundJobs = () => {
  stopHandlers.push(unpaidOrderExpiryJob.startUnpaidOrderExpiryJob());
  stopHandlers.push(paymentReconciliationJob.startPaymentReconciliationJob());
  stopHandlers.push(reviewReminderJob.startReviewReminderJob());
};

const stopBackgroundJobs = () => {
  while (stopHandlers.length > 0) {
    const stop = stopHandlers.pop();

    if (typeof stop === 'function') {
      stop();
    }
  }
};

export {
  startBackgroundJobs,
  stopBackgroundJobs,
};

export default {
  startBackgroundJobs,
  stopBackgroundJobs,
};
