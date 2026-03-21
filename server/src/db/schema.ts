import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// We import the shared type values so our database schema strictly follows them
import { JobState } from '../../../packages/shared-types/index.ts';

// 1. Projects - high level container for a video and its resulting clips
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // We'll use UUIDs
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
});

// 2. Videos - the original uploaded source media
export const videos = sqliteTable('videos', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(), // relative to storage/uploads/
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  durationSeconds: integer('duration_seconds'), // Populated after ffprobe
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
});

// 3. Jobs - the processing pipeline state machine
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: [
      JobState.PENDING,
      JobState.TRANSCRIBING,
      JobState.ANALYZING,
      JobState.CLIPPING,
      JobState.CAPTIONING,
      JobState.REFRAMING,
      JobState.COMPLETED,
      JobState.FAILED,
    ],
  })
    .default(JobState.PENDING)
    .notNull(),
  progressPercent: integer('progress_percent').default(0).notNull(),
  failedReason: text('failed_reason'), // ONLY populated if status is FAILED
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  manualJobData: text('manual_job_data'), // JSON blob for overrides and manual segments
});

// 4. Clips - the generated output videos
export const clips = sqliteTable('clips', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(), // relative to storage/clips/
  startTime: integer('start_time').notNull(), // in seconds
  endTime: integer('end_time').notNull(), // in seconds
  viralityScore: integer('virality_score'), // 1-100 assigned by LLM
  title: text('title'), // Optional auto-generated description
  explanation: text('explanation'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// 5. Settings - global configuration
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('global'),
  whisperModel: text('whisper_model').default('whisper-large-v3').notNull(),
  transcriptionBackend: text('transcription_backend').default('groq').notNull(), // groq
  llmBackend: text('llm_backend').default('openai').notNull(),
  llmModel: text('llm_model').default('gpt-4o').notNull(),
  exportQuality: text('export_quality').default('high').notNull(), // low, medium, high
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
