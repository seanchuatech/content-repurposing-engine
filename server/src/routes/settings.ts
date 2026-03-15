import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { settings } from '../db/schema';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  // Get global settings
  .get('/', async () => {
    let currentSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 'global'))
      .get();
    
    if (!currentSettings) {
      // Initialize with defaults if not found
      currentSettings = await db
        .insert(settings)
        .values({
          id: 'global',
          whisperModel: 'base',
          llmBackend: 'openai',
          llmModel: 'gpt-4o',
          exportQuality: 'high',
        })
        .returning()
        .get();
    }
    
    return currentSettings;
  })

  // Update global settings
  .patch(
    '/',
    async ({ body, set }) => {
      try {
        const updatedSettings = await db
          .update(settings)
          .set({
            ...body,
            updatedAt: new Date(),
          })
          .where(eq(settings.id, 'global'))
          .returning()
          .get();

        if (!updatedSettings) {
          set.status = 404;
          return { error: 'Settings not found' };
        }

        return updatedSettings;
      } catch (e) {
        console.error('Failed to update settings:', e);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      body: t.Object({
        whisperModel: t.Optional(t.String()),
        llmBackend: t.Optional(t.String()),
        llmModel: t.Optional(t.String()),
        exportQuality: t.Optional(t.String()),
      }),
    }
  );
