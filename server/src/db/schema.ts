import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// We import the shared type values so our database schema strictly follows them
import { JobState } from '../../../packages/shared-types/index.ts';

// 1. Projects - high level container for a video and its resulting clips
export const projects = pgTable('projects', {
  id: text('id').primaryKey(), // We'll use UUIDs
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Videos - the original uploaded source media
export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(), // relative to storage/uploads/
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  durationSeconds: integer('duration_seconds'), // Populated after ffprobe
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Jobs - the processing pipeline state machine
export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  status: text('status')
    .default(JobState.PENDING)
    .notNull(),
  progressPercent: integer('progress_percent').default(0).notNull(),
  failedReason: text('failed_reason'), // ONLY populated if status is FAILED
  transcriptionBackend: text('transcription_backend'),
  whisperModel: text('whisper_model'),
  llmBackend: text('llm_backend'),
  llmModel: text('llm_model'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  manualJobData: text('manual_job_data'), // JSON blob for overrides and manual segments
});

// 4. Clips - the generated output videos
export const clips = pgTable('clips', {
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// 5. Settings - global configuration
export const settings = pgTable('settings', {
  id: text('id').primaryKey().default('global'),
  whisperModel: text('whisper_model').default('whisper-large-v3').notNull(),
  transcriptionBackend: text('transcription_backend').default('groq').notNull(), // groq
  llmBackend: text('llm_backend').default('openai').notNull(),
  llmModel: text('llm_model').default('gpt-4o').notNull(),
  exportQuality: text('export_quality').default('high').notNull(), // low, medium, high
  updatedAt: timestamp('updated_at'),
});

// 6. Downloads - standalone youtube downloads
export const downloads = pgTable('downloads', {
  id: text('id').primaryKey(),
  youtubeUrl: text('youtube_url').notNull(),
  quality: text('quality').notNull(), // best, 1080p, 720p, audio
  status: text('status').notNull().default('PENDING'), // PENDING, DOWNLOADING, COMPLETED, FAILED
  progressPercent: integer('progress_percent').notNull().default(0),
  filePath: text('file_path'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  failedReason: text('failed_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});
