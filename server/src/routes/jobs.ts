import { Stream } from '@elysiajs/stream';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { clips, jobs } from '../db/schema';
import { videoProcessingQueue } from '../queue/connection';

export const jobsRoutes = new Elysia({ prefix: '/jobs' })
  // Get job status via REST
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const job = await db.select().from(jobs).where(eq(jobs.id, id)).get();
      if (!job) {
        set.status = 404;
        return { error: 'Job not found' };
      }

      // If completed, fetch the associated clips
      let resultClips: (typeof clips.$inferSelect)[] = [];
      if (job.status === JobState.COMPLETED) {
        resultClips = await db
          .select()
          .from(clips)
          .where(eq(clips.jobId, id))
          .all();
      }

      return { ...job, clips: resultClips };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // SSE Endpoint for real-time progress
  // biome-ignore lint/suspicious/noExplicitAny: Stream signature has tricky types
  .get(
    '/:id/events',
    ({ params: { id } }) =>
      new Stream(async (stream: any) => {
        // 1. Send initial connection success event
        stream.event = 'connected';
        stream.send({ message: 'Connected to Job Stream', jobId: id });

        let isAlive = true;

        // Clean up when the client disconnects
        stream.on('close', () => {
          isAlive = false;
        });

        // 2. Poll DB and BullMQ for live events
        // In a fully optimized system, we could subscribe to Redis pub-sub,
        // but DB polling is perfectly acceptable for the MVP scale.
        while (isAlive) {
          const job = await db.select().from(jobs).where(eq(jobs.id, id)).get();

          if (!job) {
            stream.event = 'error';
            stream.send({ error: 'Job not found' });
            stream.close();
            break;
          }

          stream.event = 'progress';
          stream.send({
            status: job.status,
            progressPercent: job.progressPercent,
            failedReason: job.failedReason,
          });

          // If job is in terminal state, fetch clips, send final payload, and close the stream
          if (job.status === JobState.COMPLETED) {
            const resultClips = await db
              .select()
              .from(clips)
              .where(eq(clips.jobId, id))
              .all();
            stream.event = 'completed';
            stream.send({ status: job.status, clips: resultClips });
            stream.close();
            break;
          }

          if (job.status === JobState.FAILED) {
            stream.event = 'failed';
            stream.send({ status: job.status, error: job.failedReason });
            stream.close();
            break;
          }

          // Wait 1 second between ticks
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }),
    {
      params: t.Object({ id: t.String() }),
    },
  );
