import logger from '@/common/logger/logger.js';
import {
  enableUnpaidOrderExpiryJobs,
  unpaidOrderExpiryBatchSize,
  unpaidOrderExpiryIntervalMs,
  unpaidOrderExpiryMinutes,
} from '@/config/env.config.js';
import orderService from '@/modules/order/services/order.service.js';

let unpaidOrderExpiryInterval = null;

const runUnpaidOrderExpiryJob = async () => {
  try {
    const expiredOrders = await orderService.expireStaleUnpaidOrders({
      limit: unpaidOrderExpiryBatchSize,
      olderThanMinutes: unpaidOrderExpiryMinutes,
    });

    if (expiredOrders.length > 0) {
      logger.info('Expired stale unpaid orders', {
        count: expiredOrders.length,
        orderIds: expiredOrders.map((entry) => entry.orderId),
      });
    }
  } catch (error) {
    logger.error('Unpaid order expiry job failed', error);
  }
};

const startUnpaidOrderExpiryJob = () => {
  if (!enableUnpaidOrderExpiryJobs || unpaidOrderExpiryInterval) {
    return () => {};
  }

  unpaidOrderExpiryInterval = setInterval(runUnpaidOrderExpiryJob, unpaidOrderExpiryIntervalMs);
  logger.info('Unpaid order expiry job started', { intervalMs: unpaidOrderExpiryIntervalMs });

  runUnpaidOrderExpiryJob();

  return () => {
    if (unpaidOrderExpiryInterval) {
      clearInterval(unpaidOrderExpiryInterval);
      unpaidOrderExpiryInterval = null;
      logger.info('Unpaid order expiry job stopped');
    }
  };
};

export { startUnpaidOrderExpiryJob };

export default {
  startUnpaidOrderExpiryJob,
};
