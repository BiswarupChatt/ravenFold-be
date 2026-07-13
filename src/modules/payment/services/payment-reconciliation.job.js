import logger from '@/common/logger/logger.js';
import {
  enablePaymentReconciliationJobs,
  paymentReconciliationBatchSize,
  paymentReconciliationIntervalMs,
  paymentReconciliationMinAgeMs,
} from '@/config/env.config.js';
import paymentService from '@/modules/payment/services/payment.service.js';

let paymentReconciliationInterval = null;

const runPaymentReconciliationJob = async () => {
  try {
    const processedAttempts = await paymentService.reconcileStalePaymentAttempts({
      limit: paymentReconciliationBatchSize,
      minAgeMs: paymentReconciliationMinAgeMs,
    });

    if (processedAttempts.length > 0) {
      logger.info('Processed payment reconciliation batch', {
        attemptIds: processedAttempts.map((entry) => entry.paymentAttemptId),
        count: processedAttempts.length,
      });
    }
  } catch (error) {
    logger.error('Payment reconciliation job failed', error);
  }
};

const startPaymentReconciliationJob = () => {
  if (!enablePaymentReconciliationJobs || paymentReconciliationInterval) {
    return () => {};
  }

  paymentReconciliationInterval = setInterval(runPaymentReconciliationJob, paymentReconciliationIntervalMs);
  logger.info('Payment reconciliation job started', { intervalMs: paymentReconciliationIntervalMs });

  runPaymentReconciliationJob();

  return () => {
    if (paymentReconciliationInterval) {
      clearInterval(paymentReconciliationInterval);
      paymentReconciliationInterval = null;
      logger.info('Payment reconciliation job stopped');
    }
  };
};

export { startPaymentReconciliationJob };

export default {
  startPaymentReconciliationJob,
};
