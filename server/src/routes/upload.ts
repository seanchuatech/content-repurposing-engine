import path from 'node:path';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { jobs, projects, videos, settings } from '../db/schema';
import { dispatchVideoProcessingJob } from '../queue/producers';

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .post(
    '/',
    async ({ body, set }) => {
      // 1. Validate file exists
      const file = body.file as File;
      if (!file) {
        set.status = 400;
        return { error: 'No video file uploaded' };
      }

      // 2. Validate MIME type or extension
      const validMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
      const validExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
      const extension = path.extname(file.name).toLowerCase();
      
      if (!validMimes.includes(file.type) && !validExtensions.includes(extension)) {
        set.status = 400;
        return {
          error: `Invalid file type (${file.type}). Only MP4, MOV, WebM, and MKV are supported.`,
        };
      }

      try {
        // 3. Save the uploaded file to disk
        const fileId = uuidv4();
        const extension = path.extname(file.name) || '.mp4';
        const fileName = `${fileId}${extension}`;
        const relativePath = path.join('storage', 'uploads', fileName);
        const absolutePath = path.resolve(process.cwd(), '..', relativePath);

        await Bun.write(absolutePath, file);

        // 4. Create new Project
        const projectId = uuidv4();
        await db.insert(projects).values({
          id: projectId,
          title: `Project: ${file.name}`,
        });

        // 5. Create Video Entry
        const videoId = uuidv4();
        await db.insert(videos).values({
          id: videoId,
          projectId,
          filePath: relativePath,
          originalName: file.name,
          mimeType: file.type,
        });

        const globalSettings = await db.select().from(settings).where(eq(settings.id, 'global')).get();

        // 6. Create Job Entry
        const jobId = uuidv4();
        await db.insert(jobs).values({
          id: jobId,
          projectId,
          videoId,
          status: JobState.PENDING,
          progressPercent: 0,
          manualJobData: body.manualSegments ? JSON.stringify(body.manualSegments) : null,
          transcriptionBackend: globalSettings?.transcriptionBackend,
          whisperModel: body.whisperModel || globalSettings?.whisperModel,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
        });

        // 7. Dispatch the background processing job
        await dispatchVideoProcessingJob({
          jobId,
          projectId,
          videoId,
          filePath: relativePath,
          whisperModel: body.whisperModel || globalSettings?.whisperModel,
          manualSegments: body.manualSegments,
          transcriptionBackend: globalSettings?.transcriptionBackend,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
        });

        // 8. Return exactly what the client needs to start tracking progress
        return {
          projectId,
          jobId,
          message: 'Upload successful. Processing has begun.',
        };
      } catch (e) {
        console.error('Upload failure:', e);
        set.status = 500;
        return { error: 'Failed to process upload' };
      }
    },
    {
      body: t.Object({
        file: t.File(),
        whisperModel: t.Optional(t.String()),
        manualSegments: t.Optional(t.Array(t.Object({
          start: t.Number(),
          end: t.Number(),
          title: t.String(),
        }))),
      }),
    },
  )
  .post(
    '/youtube',
    async ({ body, set }) => {
      const { url } = body;
      if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
        set.status = 400;
        return { error: 'Invalid YouTube URL' };
      }

      try {
        const projectId = uuidv4();
        const videoId = uuidv4();
        const jobId = uuidv4();

        // Create Project
        await db.insert(projects).values({
          id: projectId,
          title: `YouTube Import: ${url}`,
        });

        // Create Video Entry (filePath will be updated by worker after download)
        await db.insert(videos).values({
          id: videoId,
          projectId,
          filePath: 'PENDING_DOWNLOAD',
          originalName: url,
          mimeType: 'video/youtube',
        });

        const globalSettings = await db.select().from(settings).where(eq(settings.id, 'global')).get();

        // Create Job Entry
        await db.insert(jobs).values({
          id: jobId,
          projectId,
          videoId,
          status: JobState.PENDING,
          progressPercent: 0,
          manualJobData: body.manualSegments ? JSON.stringify(body.manualSegments) : null,
          transcriptionBackend: globalSettings?.transcriptionBackend,
          whisperModel: body.whisperModel || globalSettings?.whisperModel,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
        });

        // Dispatch Job with URL
        await dispatchVideoProcessingJob({
          jobId,
          projectId,
          videoId,
          filePath: url,
          whisperModel: body.whisperModel || globalSettings?.whisperModel,
          manualSegments: body.manualSegments,
          useYouTubeSubtitles: body.useYouTubeSubtitles,
          transcriptionBackend: globalSettings?.transcriptionBackend,
          llmBackend: globalSettings?.llmBackend,
          llmModel: globalSettings?.llmModel,
        });

        return {
          projectId,
          jobId,
          message: 'YouTube import initiated.',
        };
      } catch (e) {
        console.error('YouTube import failure:', e);
        set.status = 500;
        return { error: 'Failed to initiate YouTube import' };
      }
    },
    {
      body: t.Object({
        url: t.String(),
        whisperModel: t.Optional(t.String()),
        useYouTubeSubtitles: t.Optional(t.Boolean()),
        manualSegments: t.Optional(t.Array(t.Object({
          start: t.Number(),
          end: t.Number(),
          title: t.String(),
        }))),
      }),
    }
  );
