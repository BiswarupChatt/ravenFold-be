import logger from '@/common/logger/logger.js';
import {
  enableReviewReminderJobs,
  reviewReminderJobIntervalMs,
} from '@/config/env.config.js';
import reviewReminderService from '@/modules/review/services/review-reminder.service.js';

let reviewReminderInterval = null;

const runReviewReminderJob = async () => {
  try {
    const processedReminderIds = await reviewReminderService.processDueReviewReminders();

    if (processedReminderIds.length > 0) {
      logger.info('Processed review reminders', {
        count: processedReminderIds.length,
        reminderIds: processedReminderIds,
      });
    }
  } catch (error) {
    logger.error('Review reminder job failed', error);
  }
};

const startReviewReminderJob = () => {
  if (!enableReviewReminderJobs || reviewReminderInterval) {
    return () => {};
  }

  reviewReminderInterval = setInterval(runReviewReminderJob, reviewReminderJobIntervalMs);
  logger.info('Review reminder job started', { intervalMs: reviewReminderJobIntervalMs });

  runReviewReminderJob();

  return () => {
    if (reviewReminderInterval) {
      clearInterval(reviewReminderInterval);
      reviewReminderInterval = null;
      logger.info('Review reminder job stopped');
    }
  };
};

export { startReviewReminderJob };

export default {
  startReviewReminderJob,
};
