import { and, desc, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { authGuard } from '../middleware/auth-guard';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { clips, jobs, projects, settings, videos } from '../db/schema';
import { getDispatcher } from '../dispatcher';

export const projectsRoutes = new Elysia({ prefix: '/projects' })
  .use(authGuard)
  // Get all projects with rich metadata for the Data Table
  .get('/', async ({ user }) => {
    const userId = user.userId;
    const projectsWithDetails = await db
      .select({
        project: projects,
        video: {
          originalName: videos.originalName,
          mimeType: videos.mimeType,
          durationSeconds: videos.durationSeconds,
        },
        job: {
          status: jobs.status,
          progressPercent: jobs.progressPercent,
          whisperModel: jobs.whisperModel,
          llmBackend: jobs.llmBackend,
          llmModel: jobs.llmModel,
        },
        // We use count(DISTINCT) because the join with both jobs and clips causes Cartesian product expansion per project
        clipCount:
          sql<number>`cast(count(DISTINCT ${clips.id}) as integer)`.mapWith(
            Number,
          ),
      })
      .from(projects)
      .where(eq(projects.userId, userId))
      .leftJoin(videos, eq(projects.id, videos.projectId))
      .leftJoin(jobs, eq(projects.id, jobs.projectId))
      .leftJoin(clips, eq(projects.id, clips.projectId))
      .groupBy(
        projects.id,
        videos.originalName,
        videos.mimeType,
        videos.durationSeconds,
        jobs.status,
        jobs.progressPercent,
        jobs.whisperModel,
        jobs.llmBackend,
        jobs.llmModel,
      )
      .orderBy(desc(projects.createdAt));
 
    // Map the Drizzle result to our ProjectWithDetails frontend interface cleanly
    return projectsWithDetails.map((row) => ({
      ...row.project,
      video: row.video,
      job: row.job,
      clipCount: row.clipCount,
    }));
  })

  // Get a single project
  .get(
    '/:id',
    async ({ params: { id }, user, set }) => {
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, user.userId)))
        .limit(1)
        .then((res) => res[0]);
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
    async ({ body, user }) => {
      const id = uuidv4();
      const newProject = await db
        .insert(projects)
        .values({
          id,
          userId: user.userId,
          title: body.title,
        })
        .returning()
        .then((res) => res[0]);
 
      return newProject;
    },
    {
      body: t.Object({ title: t.String() }),
    },
  )

  // Delete a project
  .delete(
    '/:id',
    async ({ params: { id }, user, set }) => {
      const deletedProject = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, user.userId)))
        .returning()
        .then((res) => res[0]);
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
    async ({ params: { id }, body, user, set }) => {
      try {
        const clipId = uuidv4();
        const newClip = await db
          .insert(clips)
          .values({
            id: body.id || clipId,
            userId: user.userId,
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
            },
          })
          .returning()
          .then((res) => res[0]);
 
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
    async ({ params: { clipId }, user, set }) => {
      const clip = await db
        .select()
        .from(clips)
        .where(and(eq(clips.id, clipId), eq(clips.userId, user.userId)))
        .limit(1)
        .then((res) => res[0]);
      if (!clip) {
        set.status = 404;
        return { error: 'Clip not found' };
      }
      return clip;
    },
    {
      params: t.Object({ clipId: t.String() }),
    },
  )

  // Update a clip's metadata or timestamps
  .patch(
    '/clips/:clipId',
    async ({ params: { clipId }, user, body, set }) => {
      try {
        const updatedClip = await db
          .update(clips)
          .set({
            startTime: body.startTime,
            endTime: body.endTime,
            title: body.title,
            updatedAt: new Date(),
          })
          .where(and(eq(clips.id, clipId), eq(clips.userId, user.userId)))
          .returning()
          .then((res) => res[0]);
 
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
    },
  )

  // Trigger regeneration of a clip
  .post(
    '/clips/:clipId/regenerate',
    async ({ params: { clipId }, user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      try {
        const clip = await db
          .select()
          .from(clips)
          .where(and(eq(clips.id, clipId), eq(clips.userId, user.userId)))
          .limit(1)
          .then((res) => res[0]);
        if (!clip) {
          set.status = 404;
          return { error: 'Clip not found' };
        }
 
        const video = await db
          .select()
          .from(videos)
          .where(and(eq(videos.id, clip.videoId), eq(videos.userId, user.userId)))
          .limit(1)
          .then((res) => res[0]);
        if (!video) {
          set.status = 404;
          return { error: 'Source video not found' };
        }

        let globalSettings = await db
          .select()
          .from(settings)
          .where(eq(settings.userId, user.userId))
          .limit(1)
          .then((res) => res[0]);
 
        // Create a new job for the regeneration
        const jobId = uuidv4();
        await db.insert(jobs).values({
          id: jobId,
          userId: user.userId,
          projectId: clip.projectId,
          videoId: clip.videoId,
          status: JobState.PENDING,
          progressPercent: 0,
          whisperModel: globalSettings?.whisperModel,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
        });

        // Dispatch job with specific clip context
        await getDispatcher().dispatchVideoProcessing({
          jobId,
          projectId: clip.projectId,
          videoId: clip.videoId,
          filePath: video.filePath,
          // We pass hints to the worker to only process this clip
          onlyClipId: clip.id,
          whisperModel: globalSettings?.whisperModel,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
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
    },
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
          .then((res) => res[0]);
 
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
    },
  );
