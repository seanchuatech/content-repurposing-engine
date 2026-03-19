import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Reuse the Redis connection for all queues to prevent connection limits
export const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6380',
  {
    maxRetriesPerRequest: null,
  },
);

// Define our main processing queue
export const videoProcessingQueue = new Queue('video-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
