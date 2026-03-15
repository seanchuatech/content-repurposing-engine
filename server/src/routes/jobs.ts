import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { clips, jobs } from '../db/schema';

export const jobsRoutes = new Elysia({ prefix: '/jobs' })
  // Get job by Project ID
  .get(
    '/project/:projectId',
    async ({ params: { projectId }, set }) => {
      const job = await db
        .select()
        .from(jobs)
        .where(eq(jobs.projectId, projectId))
        .get();
      
      if (!job) {
        set.status = 404;
        return { error: 'Job not found for this project' };
      }

      let resultClips: (typeof clips.$inferSelect)[] = [];
      if (job.status === JobState.COMPLETED) {
        resultClips = await db
          .select()
          .from(clips)
          .where(eq(clips.jobId, job.id))
          .all();
      }

      return { ...job, clips: resultClips };
    },
    {
      params: t.Object({ projectId: t.String() }),
    }
  )

  // Get job status via REST
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const job = await db.select().from(jobs).where(eq(jobs.id, id)).get();
      if (!job) {
        set.status = 404;
        return { error: 'Job not found' };
      }

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
    }
  )

  // PATCH job status and progress
  .patch(
    '/:id',
    async ({ params: { id }, body, set }) => {
      try {
        const updatedJob = await db
          .update(jobs)
          .set({
            status: body.status,
            progressPercent: body.progressPercent,
            failedReason: body.failedReason,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, id))
          .returning()
          .get();

        if (!updatedJob) {
          set.status = 404;
          return { error: 'Job not found' };
        }

        return updatedJob;
      } catch (e) {
        console.error('Failed to update job:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.String()),
        progressPercent: t.Optional(t.Number()),
        failedReason: t.Optional(t.String()),
      }),
    }
  )

  // SSE Endpoint using native ReadableStream
  .get(
    '/:id/events',
    ({ params: { id }, set }) => {
      set.headers['Content-Type'] = 'text/event-stream';
      set.headers['Cache-Control'] = 'no-cache';
      set.headers['Connection'] = 'keep-alive';

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          const sendEvent = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          sendEvent('connected', { message: 'Connected to Job Stream', jobId: id });

          let isAlive = true;
          
          // Poll loop
          while (isAlive) {
            try {
              const job = await db.select().from(jobs).where(eq(jobs.id, id)).get();

              if (!job) {
                sendEvent('error', { error: 'Job not found' });
                isAlive = false;
                controller.close();
                break;
              }

              sendEvent('progress', {
                status: job.status,
                progressPercent: job.progressPercent,
                failedReason: job.failedReason,
              });

              if (job.status === JobState.COMPLETED) {
                const resultClips = await db
                  .select()
                  .from(clips)
                  .where(eq(clips.jobId, id))
                  .all();
                sendEvent('completed', { status: job.status, clips: resultClips });
                isAlive = false;
                controller.close();
                break;
              }

              if (job.status === JobState.FAILED) {
                sendEvent('failed', { status: job.status, error: job.failedReason });
                isAlive = false;
                controller.close();
                break;
              }
            } catch (e) {
              console.error('Error in SSE loop:', e);
              isAlive = false;
              controller.error(e);
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
        cancel() {
          // This runs when user closes the tab
          console.log(`SSE connection closed for job ${id}`);
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
