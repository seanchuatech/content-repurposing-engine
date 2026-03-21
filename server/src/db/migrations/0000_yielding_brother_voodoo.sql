CREATE TABLE "clips" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"video_id" text NOT NULL,
	"job_id" text NOT NULL,
	"file_path" text NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer NOT NULL,
	"virality_score" integer,
	"title" text,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"youtube_url" text NOT NULL,
	"quality" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"file_path" text,
	"file_name" text,
	"file_size" integer,
	"failed_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"video_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"failed_reason" text,
	"transcription_backend" text,
	"whisper_model" text,
	"llm_backend" text,
	"llm_model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"manual_job_data" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"whisper_model" text DEFAULT 'whisper-large-v3' NOT NULL,
	"transcription_backend" text DEFAULT 'groq' NOT NULL,
	"llm_backend" text DEFAULT 'openai' NOT NULL,
	"llm_model" text DEFAULT 'gpt-4o' NOT NULL,
	"export_quality" text DEFAULT 'high' NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"file_path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;