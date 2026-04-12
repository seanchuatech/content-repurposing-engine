import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { downloads } from '../db/schema';
import { getDispatcher } from '../dispatcher';
import { authGuard } from '../middleware/auth-guard';

export const downloadRoutes = new Elysia({ prefix: '/download' })
  .use(authGuard)
  // List all downloads
  .get('/', async ({ user }) => {
    return await db
      .select()
      .from(downloads)
      .where(eq(downloads.userId, user!.userId))
      .orderBy(desc(downloads.createdAt));
  })

  // Start new download
  .post(
    '/',
    async ({ body, user, set }) => {
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
      if (!body.url || !youtubeRegex.test(body.url)) {
        set.status = 400;
        return { error: 'Invalid YouTube URL' };
      }

      const downloadId = uuidv4();

      // Map quality to yt-dlp format string
      let formatString = 'bestvideo+bestaudio/best';
      if (body.quality === '1080p')
        formatString = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
      else if (body.quality === '720p')
        formatString = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      else if (body.quality === 'audio') formatString = 'bestaudio/best';

      await db.insert(downloads).values({
        id: downloadId,
        userId: user!.userId,
        youtubeUrl: body.url,
        quality: body.quality,
        status: 'PENDING',
      });

      await getDispatcher().dispatchYoutubeDownload({
        downloadId,
        youtubeUrl: body.url,
        quality: body.quality,
        formatString,
      });

      set.status = 202;
      return { downloadId };
    },
    {
      body: t.Object({
        url: t.String(),
        quality: t.Union([
          t.Literal('best'),
          t.Literal('1080p'),
          t.Literal('720p'),
          t.Literal('audio'),
        ]),
      }),
    },
  )

  // Get status
  .get('/:id', async ({ params: { id }, user, set }) => {
    const record = await db
      .select()
      .from(downloads)
      .where(and(eq(downloads.id, id), eq(downloads.userId, user!.userId)))
      .limit(1)
      .then((res) => res[0]);
    if (!record) {
      set.status = 404;
      return { error: 'Not found' };
    }
    return record;
  })

  // Update status (called by python worker)
  .patch(
    '/:id',
    async ({ params: { id }, user, body, set }) => {
      // Security: Only workers (admins) can update download metadata/path
      if (user?.role !== 'admin') {
        set.status = 403;
        return { error: 'Forbidden: Only workers can update download status' };
      }

      // Typecasting Date here because schema defaults to CURRENT_TIMESTAMP sql
      const record = await db
        .update(downloads)
        .set({
          ...body,
          updatedAt: new Date() as any,
        })
        .where(eq(downloads.id, id))
        .returning()
        .then((res) => res[0]);

      if (!record) {
        set.status = 404;
        return { error: 'Not found' };
      }
      return record;
    },
    {
      body: t.Object({
        status: t.String(),
        progressPercent: t.Number(),
        filePath: t.Optional(t.String()),
        fileName: t.Optional(t.String()),
        fileSize: t.Optional(t.Number()),
        failedReason: t.Optional(t.String()),
      }),
    },
  )

  // Download file
  .get('/:id/file', async ({ params: { id }, user, set }) => {
    const record = await db
      .select()
      .from(downloads)
      .where(and(eq(downloads.id, id), eq(downloads.userId, user!.userId)))
      .limit(1)
      .then((res) => res[0]);
    if (!record || !record.filePath) {
      set.status = 404;
      return { error: 'File not found or not completed' };
    }

    const absolutePath = path.resolve(process.cwd(), '..', record.filePath);
    const file = Bun.file(absolutePath);

    if (!(await file.exists())) {
      set.status = 404;
      return { error: 'File missing on disk' };
    }

    const ext = path.extname(absolutePath);
    const safeName =
      (record.fileName || `download_${id}`).replace(/[^a-z0-9_-]/gi, '_') + ext;

    set.headers['Content-Disposition'] = `attachment; filename="${safeName}"`;
    return file;
  });
