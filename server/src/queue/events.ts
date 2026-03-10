import { QueueEvents } from 'bullmq';
import { eq } from 'drizzle-orm';
import IORedis from 'ioredis';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { jobs } from '../db/schema';

// Dedicated connection for QueueEvents (mandatory maxRetriesPerRequest: null)
const eventConnection = new IORedis('redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const videoProcessingEvents = new QueueEvents('video-processing', {
  connection: eventConnection,
});

videoProcessingEvents.on('progress', async ({ jobId, data }) => {
  const progressPercent = typeof data === 'number' ? data : 0;

  await db
    .update(jobs)
    .set({
      progressPercent,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  console.log(`[Queue] Job ${jobId} progress: ${progressPercent}%`);
});

videoProcessingEvents.on('completed', async ({ jobId }) => {
  await db
    .update(jobs)
    .set({
      status: JobState.COMPLETED,
      progressPercent: 100,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  console.log(`[Queue] Job ${jobId} completed`);
});

videoProcessingEvents.on('failed', async ({ jobId, failedReason }) => {
  await db
    .update(jobs)
    .set({
      status: JobState.FAILED,
      failedReason: failedReason || 'Unknown error',
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  console.log(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

videoProcessingEvents.on('active', async ({ jobId }) => {
  // We can update the state to something like TRANSCRIBING or just PROCESSING
  // For now, let's just make sure it's not PENDING anymore
  // Note: JobState enums are PENDING, TRANSCRIBING, etc.
  // The worker updates progress which we can use to infer state or have it send stage name in progress data.
  console.log(`[Queue] Job ${jobId} is now active`);
});
