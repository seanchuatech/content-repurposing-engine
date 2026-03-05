# Implementation Plan — Content Repurposing Engine

> **Goal**: Build an AI-powered tool that takes long-form video, detects viral
> moments, and generates platform-ready short clips (YouTube Shorts, TikTok,
> Facebook Reels).

---

## Phase 1: Project Scaffolding & Infrastructure

**Goal**: Set up the monorepo, dev tooling, and core infrastructure so every
subsequent phase has a stable foundation.

### Steps

- [ ] Initialize monorepo root (`package.json` workspace, `.gitignore`,
      `.env.example`)
- [ ] Scaffold `client/` — React + Vite + TypeScript + Tailwind CSS
- [ ] Scaffold `server/` — Bun + Elysia with basic health check route
- [ ] Scaffold `workers/` — Python project with `pyproject.toml` (uv)
- [ ] Set up Biome config (`biome.json`) for TS formatting/linting
- [ ] Set up ruff config for Python formatting/linting
- [ ] Create `docker-compose.yml` with Redis service
- [ ] Create `storage/` directories (`uploads/`, `clips/`, `temp/`)
- [ ] Verify all three services start independently

### Deliverable

All three services (`client`, `server`, `workers`) can start without errors.
Redis runs via Docker. Biome and ruff are configured.

---

## Phase 2: Database & API Server Core

**Goal**: Build the Elysia API server with project/video CRUD, file upload, and
job dispatch.

### Steps

- [ ] Set up SQLite database with Drizzle ORM (`server/src/db/`)
- [ ] Define schemas: `projects`, `videos`, `clips`, `jobs`
- [ ] Implement CRUD routes for projects (`/api/projects`)
- [ ] Implement video upload route (`/api/upload`)
  - Multipart upload, file validation (MIME type, size, FFprobe check)
  - Stream to `storage/uploads/`
- [ ] Set up BullMQ connection and job producer (`server/src/queue/`)
- [ ] Dispatch processing job on successful upload
- [ ] Implement job status route (`/api/jobs/:id`)
- [ ] Implement SSE endpoint for real-time job progress (`/api/jobs/:id/events`)
- [ ] Add global error handler and request logging middleware
- [ ] Add CORS middleware

### Deliverable

Fully functional API: upload a video file → stored on disk → job dispatched to
Redis queue → job status queryable via REST and SSE.

---

## Phase 3: Python Processing Pipeline

**Goal**: Build the AI/video processing worker that consumes jobs from the queue
and runs the full pipeline.

### Steps

#### 3a. Queue Consumer

- [ ] Set up BullMQ-compatible job consumer in Python (using `redis` or `bullmq`
      Python lib)
- [ ] Implement progress reporting callbacks (update job progress % in Redis)

#### 3b. Transcription Stage

- [ ] Integrate OpenAI Whisper (local model)
- [ ] _NOTE: Use `tiny` or `base` models for local CPU dev to avoid 10x
      slowdowns._
- [ ] Generate word-level timestamps from audio
- [ ] Output transcript as structured JSON (segments with start/end times)

#### 3c. Viral Moment Analysis Stage

- [ ] Build LLM service abstraction (Ollama local / OpenAI API)
- [ ] _NOTE: If local Ollama is too slow on CPU, fall back to OpenAI API for dev
      testing._
- [ ] Design prompt for scoring transcript segments on virality criteria:
  - Hook strength, emotional intensity, insight value, humor, controversy
- [ ] Score and rank segments, select top N candidates for clipping
- [ ] Output scored segments as structured JSON

#### 3d. Clip Extraction Stage

- [ ] Build FFmpeg service wrapper
- [ ] Extract clips at scored timestamps with configurable padding
- [ ] Output clips to `storage/clips/`

#### 3e. Caption Stage

- [ ] Generate SRT subtitles from transcript segments
- [ ] Burn captions into clip video using FFmpeg

#### 3f. Reframe Stage (9:16)

- [ ] Convert landscape clips to 9:16 portrait aspect ratio
- [ ] Start with center-crop (face tracking deferred to later phase)

#### 3g. Pipeline Orchestration

- [ ] Wire all stages into a sequential pipeline
- [ ] Each stage writes output to disk and updates job metadata
- [ ] Handle stage failures: log, mark failed, allow per-stage retry

### Deliverable

Drop a video file in `storage/uploads/`, dispatch a job manually → worker
transcribes, scores, clips, captions, and reframes → output clips appear in
`storage/clips/`.

---

## Phase 4: Frontend — Upload & Dashboard

**Goal**: Build the React UI for uploading videos, viewing projects, and
monitoring job progress.

### Steps

#### 4a. App Shell & Routing

- [ ] Set up React Router with lazy-loaded routes
- [ ] Build layout components: `Sidebar`, `Header`, `DashboardLayout`
- [ ] Define routes: `/`, `/upload`, `/projects/:id`, `/settings`

#### 4b. Upload Page

- [ ] Drag-and-drop file upload with progress indicator
- [ ] File type and size validation (client-side, before upload)
- [ ] POST to `/api/upload`, show upload progress

#### 4c. Dashboard Page

- [ ] List all projects with status badges (processing, completed, failed)
- [ ] Show thumbnail, title, date, clip count per project
- [ ] Link to individual project page

#### 4d. Project Page

- [ ] Display original video with HTML5 player
- [ ] Show processing progress (SSE-powered real-time updates)
- [ ] List generated clips with preview thumbnails
- [ ] Play individual clips inline
- [ ] Download clips (single or batch)

#### 4e. Job Progress

- [ ] `useJobStatus` hook: connect to SSE endpoint for real-time updates
- [ ] Show pipeline stage progress (transcribing → analyzing → clipping →
      captioning → reframing)
- [ ] Handle error states gracefully with retry option

### Deliverable

Full UI: upload video → watch progress in real time → browse generated clips →
preview and download.

---

## Phase 5: End-to-End Integration & Testing

**Goal**: Connect all three layers and verify the full flow works reliably.

### Steps

- [ ] End-to-end smoke test: upload via UI → API → Queue → Worker → clips appear
      in UI
- [ ] Test with various video formats (MP4, MOV, WebM)
- [ ] Test with various video lengths (30s, 5min, 30min, 1hr+)
- [ ] Test error handling: corrupt files, missing audio, worker crashes
- [ ] Test SSE reconnection on network interruption
- [ ] Verify temp file cleanup after processing
- [ ] Performance baseline: measure processing time per minute of video

### Deliverable

Stable end-to-end flow. Known performance characteristics. Error handling
validated.

---

## Phase 6: Polish & Production Readiness

**Goal**: Harden the app for real use — better UX, configuration, and
documentation.

### Steps

- [ ] Add clip editing: allow user to adjust start/end times before export
- [ ] Add clip metadata: auto-generate titles, descriptions, and hashtags
- [ ] YouTube URL import (download via `yt-dlp`)
- [ ] Settings page: configure Whisper model, LLM provider, export quality
- [ ] Dockerize the full stack (client + server + worker + Redis)
- [ ] Write comprehensive `README.md` with setup instructions
- [ ] Add `.env.example` with all variables documented

### Deliverable

A polished, locally-runnable application ready for daily use.

---

## Phase Summary

| Phase | Focus               | Key Output                                 |
| ----- | ------------------- | ------------------------------------------ |
| 1     | Scaffolding         | Monorepo structure, dev tooling, Redis     |
| 2     | API Server          | Upload, CRUD, job dispatch, SSE            |
| 3     | Processing Pipeline | Whisper + LLM + FFmpeg worker              |
| 4     | Frontend            | Upload UI, dashboard, clip viewer          |
| 5     | Integration         | End-to-end flow, error handling, testing   |
| 6     | Polish              | Clip editing, YouTube import, Docker, docs |

---

## Verification Strategy

Each phase is verified before moving to the next:

- **Phase 1**: All services start (`bun run dev`, `python -m workers`,
  `docker compose up redis`). Biome/ruff pass on empty projects.
- **Phase 2**: `curl` tests against API endpoints. Upload a file, verify it hits
  the queue.
- **Phase 3**: Manual pipeline test with a sample video. Verify clips are
  generated correctly.
- **Phase 4**: Visual browser testing. Upload flow, real-time progress, clip
  playback.
- **Phase 5**: Full end-to-end with multiple video formats and edge cases.
- **Phase 6**: Docker compose up, fresh clone setup following README, full flow.
