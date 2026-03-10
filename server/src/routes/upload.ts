import path from 'node:path';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { JobState } from '../../../packages/shared-types/index.ts';
import { db } from '../db/client';
import { jobs, projects, videos } from '../db/schema';
import { dispatchVideoProcessingJob } from '../queue/producers';

export const uploadRoutes = new Elysia({ prefix: '/upload' }).post(
  '/',
  async ({ body, set }) => {
    // 1. Validate file exists
    const file = body.file as File;
    if (!file) {
      set.status = 400;
      return { error: 'No video file uploaded' };
    }

    // 2. Validate MIME type
    const validMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validMimes.includes(file.type)) {
      set.status = 400;
      return {
        error: 'Invalid file type. Only MP4, MOV, and WebM are supported',
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

      // 6. Create Job Entry
      const jobId = uuidv4();
      await db.insert(jobs).values({
        id: jobId,
        projectId,
        videoId,
        status: JobState.PENDING,
        progressPercent: 0,
      });

      // 7. Dispatch the background processing job
      await dispatchVideoProcessingJob({
        jobId,
        projectId,
        videoId,
        filePath: relativePath,
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
    }),
  },
);
