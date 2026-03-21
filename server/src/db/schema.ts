import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

// We import the shared type values so our database schema strictly follows them
import { JobState } from '../../../packages/shared-types/index.ts';

// --- NEW AUTH & BILLING TABLES ---

// 0. Users - Core identity
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for OAuth-only accounts
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user').notNull(), // user, admin
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 1. Auth Providers - Supports multiple auth methods per user (Google, Apple, etc.)
export const authProviders = pgTable(
  'auth_providers',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // google, apple, email
    providerUserId: text('provider_user_id').notNull(), // External ID or email
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.provider, table.providerUserId)],
);

// 2. Subscriptions - Stripe state
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  status: text('status').default('inactive').notNull(), // active, canceled, past_due, inactive, trialing
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- EXISTING TABLES (MODIFIED WITH USER_ID) ---

// 3. Projects - high level container for a video and its resulting clips
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Videos - the original uploaded source media
export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  durationSeconds: integer('duration_seconds'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Jobs - the processing pipeline state machine
export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  status: text('status').default(JobState.PENDING).notNull(),
  progressPercent: integer('progress_percent').default(0).notNull(),
  failedReason: text('failed_reason'),
  transcriptionBackend: text('transcription_backend'),
  whisperModel: text('whisper_model'),
  llmBackend: text('llm_backend'),
  llmModel: text('llm_model'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  manualJobData: text('manual_job_data'),
});

// 6. Clips - the generated output videos
export const clips = pgTable('clips', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time').notNull(),
  viralityScore: integer('virality_score'),
  title: text('title'),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// 7. Settings - user-specific configuration (was global, now per-user)
export const settings = pgTable('settings', {
  id: text('id').primaryKey(), // We'll keep sharing global defaults but can also have per-user settings
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  whisperModel: text('whisper_model').default('whisper-large-v3').notNull(),
  transcriptionBackend: text('transcription_backend').default('groq').notNull(),
  llmBackend: text('llm_backend').default('openai').notNull(),
  llmModel: text('llm_model').default('gpt-4o').notNull(),
  exportQuality: text('export_quality').default('high').notNull(),
  updatedAt: timestamp('updated_at'),
});

// 8. Downloads - standalone youtube downloads
export const downloads = pgTable('downloads', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  youtubeUrl: text('youtube_url').notNull(),
  quality: text('quality').notNull(),
  status: text('status').notNull().default('PENDING'),
  progressPercent: integer('progress_percent').notNull().default(0),
  filePath: text('file_path'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  failedReason: text('failed_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});
