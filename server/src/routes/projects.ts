import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { clips, projects, videos, jobs } from '../db/schema';
import { dispatchVideoProcessingJob } from '../queue/producers';

export const projectsRoutes = new Elysia({ prefix: '/projects' })
  // Get all projects
  .get('/', async () => {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(projects.createdAt);
    return allProjects;
  })

  // Get a single project
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();
      if (!project) {
        set.status = 404;
        return { error: 'Project not found' };
      }
      return project;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create a new project
  .post(
    '/',
    async ({ body }) => {
      const id = uuidv4();
      const newProject = await db
        .insert(projects)
        .values({
          id,
          title: body.title,
        })
        .returning()
        .get();

      return newProject;
    },
    {
      body: t.Object({ title: t.String() }),
    },
  )

  // Delete a project
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const deletedProject = await db
        .delete(projects)
        .where(eq(projects.id, id))
        .returning()
        .get();
      if (!deletedProject) {
        set.status = 404;
        return { error: 'Project not found' };
      }
      return deletedProject;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create a new clip for a project (used by workers)
  .post(
    '/:id/clips',
    async ({ params: { id }, body, set }) => {
      try {
        const clipId = uuidv4();
        const newClip = await db
          .insert(clips)
          .values({
            id: body.id || clipId,
            projectId: id,
            videoId: body.videoId,
            jobId: body.jobId,
            startTime: body.startTime,
            endTime: body.endTime,
            title: body.title,
            viralityScore: body.viralityScore,
            explanation: body.explanation,
            filePath: body.storagePath,
          })
          .onConflictDoUpdate({
            target: clips.id,
            set: {
              startTime: body.startTime,
              endTime: body.endTime,
              title: body.title,
              viralityScore: body.viralityScore,
              explanation: body.explanation,
              filePath: body.storagePath,
              updatedAt: new Date(),
            }
          })
          .returning()
          .get();

        return newClip;
      } catch (e) {
        console.error('Failed to create clip:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        id: t.Optional(t.String()),
        videoId: t.String(),
        jobId: t.String(),
        startTime: t.Number(),
        endTime: t.Number(),
        title: t.String(),
        viralityScore: t.Number(),
        explanation: t.Optional(t.String()),
        storagePath: t.String(),
      }),
    },
  )

  // Get a single clip
  .get(
    '/clips/:clipId',
    async ({ params: { clipId }, set }) => {
      const clip = await db
        .select()
        .from(clips)
        .where(eq(clips.id, clipId))
        .get();
      if (!clip) {
        set.status = 404;
        return { error: 'Clip not found' };
      }
      return clip;
    },
    {
      params: t.Object({ clipId: t.String() }),
    }
  )

  // Update a clip's metadata or timestamps
  .patch(
    '/clips/:clipId',
    async ({ params: { clipId }, body, set }) => {
      try {
        const updatedClip = await db
          .update(clips)
          .set({
            startTime: body.startTime,
            endTime: body.endTime,
            title: body.title,
            updatedAt: new Date(),
          })
          .where(eq(clips.id, clipId))
          .returning()
          .get();

        if (!updatedClip) {
          set.status = 404;
          return { error: 'Clip not found' };
        }

        return updatedClip;
      } catch (e) {
        console.error('Failed to update clip:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      params: t.Object({ clipId: t.String() }),
      body: t.Object({
        startTime: t.Optional(t.Number()),
        endTime: t.Optional(t.Number()),
        title: t.Optional(t.String()),
      }),
    }
  )

  // Trigger regeneration of a clip
  .post(
    '/clips/:clipId/regenerate',
    async ({ params: { clipId }, set }) => {
      try {
        const clip = await db.select().from(clips).where(eq(clips.id, clipId)).get();
        if (!clip) {
          set.status = 404;
          return { error: 'Clip not found' };
        }

        const video = await db.select().from(videos).where(eq(videos.id, clip.videoId)).get();
        if (!video) {
          set.status = 404;
          return { error: 'Source video not found' };
        }

        // Create a new job for the regeneration
        const jobId = uuidv4();
        await db.insert(jobs).values({
          id: jobId,
          projectId: clip.projectId,
          videoId: clip.videoId,
          status: JobState.PENDING,
          progressPercent: 0,
        });

        // Dispatch job with specific clip context
        await dispatchVideoProcessingJob({
          jobId,
          projectId: clip.projectId,
          videoId: clip.videoId,
          filePath: video.filePath,
          // We pass hints to the worker to only process this clip
          onlyClipId: clip.id, 
        });

        return { jobId, message: 'Regeneration job dispatched' };
      } catch (e) {
        console.error('Failed to dispatch regeneration:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      params: t.Object({ clipId: t.String() }),
    }
  )

  // Update a video entry (used by workers after download)
  .patch(
    '/videos/:id',
    async ({ params: { id }, body, set }) => {
      try {
        const updatedVideo = await db
          .update(videos)
          .set({
            filePath: body.filePath,
            durationSeconds: body.durationSeconds,
          })
          .where(eq(videos.id, id))
          .returning()
          .get();

        if (!updatedVideo) {
          set.status = 404;
          return { error: 'Video not found' };
        }

        return updatedVideo;
      } catch (e) {
        console.error('Failed to update video:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        filePath: t.Optional(t.String()),
        durationSeconds: t.Optional(t.Number()),
      }),
    }
  );
