# Implementation Plan — Content Repurposing Engine

> **Goal**: Build an AI-powered tool that takes long-form video, detects viral
> moments, and generates platform-ready short clips (YouTube Shorts, TikTok,
> Facebook Reels).

---

## Phase 1: Project Scaffolding & Infrastructure

**Goal**: Set up the monorepo, dev tooling, and core infrastructure so every
subsequent phase has a stable foundation.

### Steps

- [x] Initialize monorepo root (`package.json` workspace, `.gitignore`,
      `.env.example`)
- [x] Scaffold `client/` — React + Vite + TypeScript + Tailwind CSS
- [x] Scaffold `server/` — Bun + Elysia with basic health check route
- [x] Scaffold `workers/` — Python project with `pyproject.toml` (uv)
- [x] Set up Biome config (`biome.json`) for TS formatting/linting
- [x] Set up ruff config for Python formatting/linting
- [x] Create `docker-compose.yml` with Redis service
- [x] Create `storage/` directories (`uploads/`, `clips/`, `temp/`)
- [x] Verify all three services start independently

### Deliverable

All three services (`client`, `server`, `workers`) can start without errors.
Redis runs via Docker. Biome and ruff are configured.

### Manual Verification
1.  **Infrastructure**: Run `docker compose up -d redis`. Verify it's running with `docker ps`.
2.  **Server**: `cd server && bun install && bun run src/index.ts`. Verify "Elysia is running at localhost:3000".
3.  **Client**: `cd client && npm install && npm run dev`. Verify the Vite dev server starts.
4.  **Worker**: `cd workers && uv sync && uv run src/main.py`. Verify the worker starts and connects to Redis.
5.  **Linting**: Run `biome check .` and `cd workers && ruff check .` to ensure zero errors.

---

## Phase 2: Database & API Server Core

**Goal**: Build the Elysia API server with project/video CRUD, file upload, and
job dispatch.

### Steps

- [x] Set up SQLite database with Drizzle ORM (`server/src/db/`)
- [x] Define schemas: `projects`, `videos`, `clips`, `jobs`
  - *Recommendation*: `jobs` schema must include specific progression tracking (`progress_percent: integer`) and error metadata (`failed_reason: text`) for resilient SSE polling.
- [x] Implement CRUD routes for projects (`/api/projects`)
- [x] Implement video upload route (`/api/upload`)
  - [x] Multipart upload, file validation (MIME type, size)
  - [ ] Pre-upload validation: use `fluent-ffmpeg` (ffprobe) to verify real video
    duration, codecs, and resolution before queuing
  - [x] Stream to `storage/uploads/`
- [x] Set up BullMQ connection and job producer (`server/src/queue/`)
- [x] Dispatch processing job on successful upload
- [x] Implement job status route (`/api/jobs/:id`)
- [x] Define strict Job State Machine shared types:
      `PENDING -> TRANSCRIBING -> ANALYZING -> CLIPPING -> CAPTIONING -> REFRAMING -> COMPLETED/FAILED`.
  - *Recommendation*: Define these in a shared `types` package (e.g., `packages/shared-types` or symlinked) so the frontend, backend, and python worker all share the exact same enums.
- [x] Implement SSE endpoint for real-time job progress (`/api/jobs/:id/events`)
- [x] Add global error handler and request logging middleware
- [x] Add CORS middleware

### Deliverable

Fully functional API: upload a video file → stored on disk → job dispatched to
Redis queue → job status queryable via REST and SSE.

### Manual Verification
1.  **Database**: Verify `content-engine.db` exists in the root.
2.  **API CRUD**: `curl http://localhost:3000/api/projects` should return an empty array `[]`.
3.  **Upload**: `curl -X POST -F "video=@path/to/test.mp4" http://localhost:3000/api/upload`.
    -   Check `storage/uploads/` for the saved file.
    -   Check the response for a `jobId`.
4.  **Queue**: Use `redis-cli monitor` while uploading to see the job being added to the `video-processing` queue.
5.  **Status**: `curl http://localhost:3000/api/jobs/<jobId>` to see the current state (should be `PENDING` if worker is off).
6.  **SSE**: `curl -N http://localhost:3000/api/jobs/<jobId>/events` and watch for real-time updates as you manually move the job state in the DB or via a worker.

---

## Phase 3: Python Processing Pipeline

**Goal**: Build the AI/video processing worker that consumes jobs from the queue
and runs the full pipeline.

### Steps

#### 3a. Queue Consumer

- [x] Set up BullMQ-compatible job consumer in Python (using `bullmq` Python lib)
- [x] Implement progress reporting callbacks (update job progress % via BullMQ)

**Manual Verification**
1.  Start the worker: `cd workers && uv run src/main.py`.
2.  Upload a video via the API.
3.  Verify the worker logs show "Received job" and "Started processing".
4.  Check the server logs or SSE stream to see progress percentage updates.

#### 3b. Transcription Stage

- [ ] Integrate OpenAI Whisper (local model)
- [ ] _NOTE: Use `tiny` or `base` models for local CPU dev to avoid 10x
      slowdowns._
- [ ] Implement Explicit Device Selection (`cpu`, `cuda`, `mps`) via ENV
      variables.
- [ ] Generate word-level timestamps from audio
- [ ] Output transcript as structured JSON (segments with start/end times)

**Manual Verification**
1.  Run the worker with a sample video.
2.  Check the logs for "Transcription complete".
3.  Verify a JSON file exists in `storage/temp/<job_id>/transcript.json` with word-level timestamps.

#### 3c. Viral Moment Analysis Stage

- [ ] Build LLM service abstraction (Ollama local / OpenAI API)
- [ ] _NOTE: If local Ollama is too slow on CPU, fall back to OpenAI API for dev
      testing._
- [ ] Design prompt for scoring transcript segments on virality criteria:
  - Hook strength, emotional intensity, insight value, humor, controversy
- [ ] Score and rank segments, select top N candidates for clipping
- [ ] Output scored segments as structured JSON

**Manual Verification**
1.  Provide the worker with a pre-generated `transcript.json`.
2.  Check logs for "Analysis complete".
3.  Verify `storage/temp/<job_id>/analysis.json` contains segments with `virality_score` and `reasoning`.

#### 3d. Clip Extraction Stage

- [ ] Build FFmpeg service wrapper
- [ ] Extract clips at scored timestamps with configurable padding
- [ ] Output clips to `storage/clips/`

**Manual Verification**
1.  Run the clipping stage with a sample video and `analysis.json`.
2.  Verify new `.mp4` files appear in `storage/clips/<project_id>/`.
3.  Play the clips to ensure they start/end at the correct times.

#### 3e. Caption Stage

- [ ] Generate SRT subtitles from transcript segments
- [ ] Burn captions into clip video using FFmpeg

**Manual Verification**
1.  Run the captioning stage on an extracted clip.
2.  Verify the output video has hardcoded text at the bottom.
3.  Confirm the captions match the audio timing.

#### 3f. Reframe Stage (9:16)

- [ ] Convert landscape clips to 9:16 portrait aspect ratio
- [ ] Implement "Smart Crop" instruction using FFmpeg motion/saliency tracking
      (Option B) to center the action without heavy ML models.

**Manual Verification**
1.  Run the reframe stage on a 16:9 clip.
2.  Verify the output is 9:16 resolution (e.g., 1080x1920).
3.  Check if the "Smart Crop" keeps the subject centered during movement.

#### 3g. Pipeline Orchestration

- [/] Wire all stages into a sequential pipeline (Scaffolded)
- [ ] Each stage writes output to disk and updates job metadata
- [ ] Handle stage failures: log, mark failed, allow per-stage retry

**Manual Verification**
1.  Dispatch a single upload job.
2.  Wait for the worker to finish all stages.
3.  Verify the final clips in `storage/clips/` are captioned, reframed, and high-quality.

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

**Manual Verification**
1.  Navigate to `/upload`, `/projects/1`, and `/settings`.
2.  Verify the URL changes and the correct placeholder content is shown.

#### 4b. Upload Page

- [ ] Drag-and-drop file upload with progress indicator
- [ ] File type and size validation (client-side, before upload)
- [ ] POST to `/api/upload`, show upload progress

**Manual Verification**
1.  Drag a video into the upload zone.
2.  Verify the progress bar updates from 0% to 100%.
3.  Check the "Success" toast/message after completion.

#### 4c. Dashboard Page

- [ ] List all projects with status badges (processing, completed, failed)
- [ ] Show thumbnail, title, date, clip count per project
- [ ] Link to individual project page

**Manual Verification**
1.  Open the dashboard.
2.  Verify previously uploaded videos appear as project cards.
3.  Click a card and ensure it navigates to the Project Page.

#### 4d. Project Page

- [ ] Display original video with HTML5 player
- [ ] Show processing progress (SSE-powered real-time updates)
- [ ] List generated clips with preview thumbnails
- [ ] Play individual clips inline
- [ ] Download clips (single or batch)

**Manual Verification**
1.  While a video is processing, verify the Project Page shows a live progress bar and stage status (e.g., "Transcribing...").
2.  Once complete, play a generated clip in the browser.
3.  Click "Download" and verify the file is saved to your computer.

#### 4e. Job Progress

- [ ] `useJobStatus` hook: connect to SSE endpoint for real-time updates
- [ ] Show pipeline stage progress (transcribing → analyzing → clipping →
      captioning → reframing)
- [ ] Handle error states gracefully with retry option

**Manual Verification**
1.  Disconnect the worker during a job.
2.  Verify the UI shows a "Failed" status and an error message.
3.  Reconnect the worker and click "Retry" (if implemented).

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

**Manual Verification**
1.  **Smoke Test**: Perform one full upload-to-clip cycle.
2.  **Edge Cases**: Upload a 0-byte file (should error) or a non-video file (should be blocked).
3.  **Stress Test**: Upload a 15-minute video and verify it completes without memory issues.
4.  **Cleanup**: After a job finishes, check `storage/temp/` is empty.

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

**Manual Verification**
1.  **YouTube**: Paste a YouTube link and verify it downloads and starts processing.
2.  **Settings**: Change the Whisper model to `tiny` and verify faster processing.
3.  **Docker**: Run `docker compose up` and verify the entire app works on `localhost:3000`.

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
