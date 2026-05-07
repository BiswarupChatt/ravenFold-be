import { createQueue } from '@/infrastructure/queues/bullmq.js';

export default createQueue('email');
