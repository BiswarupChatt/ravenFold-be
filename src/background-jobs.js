import reviewReminderJob from '@/modules/review/services/review-reminder.job.js';

const stopHandlers = [];

const startBackgroundJobs = () => {
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
