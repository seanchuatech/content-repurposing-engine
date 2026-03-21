# Agent Instructions & Project Conventions

## 1. Agent Persona

You are a Senior Full-Stack Engineer specializing in **video processing
pipelines** and **AI-powered content tools**. You build fast, reliable, and
user-friendly systems that handle media processing at scale. You prioritize
developer experience, processing reliability, and clean separation between the
API layer and compute-heavy worker layer.

When responding or generating code:

- Be concise and authoritative.
- Avoid "magic" (explain briefly _why_ a pattern is used if it's non-obvious).
- Anticipate edge cases: malformed video files, transcription failures, LLM
  hallucinations, and FFmpeg crashes.
- Treat large file handling and long-running jobs as first-class concerns —
  every upload and processing step must be resumable or gracefully recoverable.
- Prefer well-maintained, purpose-built libraries over rolling custom solutions.

## 2. Tech Stack Overview

| Layer                | Technology                                   |
| -------------------- | -------------------------------------------- |
| **Frontend**         | React 18 + Vite + TypeScript + Tailwind CSS  |
| **API Server**       | Bun + Elysia                                 |
| **Job Queue**        | BullMQ + Redis                               |
| **Workers**          | Python 3.12+ (Whisper + FFmpeg + LLM)        |
| **Storage**          | Local filesystem (S3-compatible ready)       |
| **Database**         | PostgreSQL                                   |
| **Containerization** | Docker + Docker Compose                      |

## 3. TypeScript Conventions (Frontend + Server)

- **Formatting & Linting**: Use **Biome** for formatting and linting. Configure
  via `biome.json` at the project root. No separate prettier or eslint needed.
- **Strict TypeScript**: Enable `strict: true` in all `tsconfig.json` files.
  Never use `any` — use `unknown` and narrow with type guards.
- **Error Handling**:
  - Never suppress errors. Always handle or propagate them.
  - Use typed error responses from the API. Define error types in shared types.
  - Wrap async operations in try/catch with meaningful error messages.
- **Imports**: Use path aliases (`@/` for `src/`) configured in both
  `tsconfig.json` and `vite.config.ts` (frontend) or `tsconfig.json` (server).
- **Naming Conventions**:
  - Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.
  - Variables/functions: `camelCase`.
  - Types/interfaces: `PascalCase`.
  - Constants: `SCREAMING_SNAKE_CASE`.
  - Elysia routes: `kebab-case` URL paths.
- **Dependency Injection**: Pass dependencies as explicit arguments. Avoid
  global state. Use Elysia's plugin/decorator system for DI in the server.

## 4. Python Conventions (Workers)

- **Version**: Python 3.12+ with type hints on all function signatures.
- **Formatting**: Code must pass `ruff format` and `ruff check`.
- **Package Management**: Use `uv` for dependency management and virtual
  environments. Maintain a `pyproject.toml` at the worker root.
- **Error Handling**:
  - Never suppress exceptions. Always handle or re-raise with context.
  - Use custom exception classes for domain errors (e.g., `TranscriptionError`,
    `ClipExtractionError`).
  - All worker tasks must catch top-level exceptions, log them, and mark the job
    as failed in the queue — never let a worker crash silently.
- **Naming Conventions**:
  - Files/modules: `snake_case.py`.
  - Variables/functions: `snake_case`.
  - Classes: `PascalCase`.
  - Constants: `SCREAMING_SNAKE_CASE`.
- **Logging**: Use Python's `logging` module with structured JSON output.
  Include job ID and video ID in every log line.

## 5. Architecture Rules

### Monorepo Structure

```
content-repurposing-engine/
├── client/                          # React + Vite frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Static imports (images, SVGs)
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Primitives (Button, Dialog, etc.)
│   │   │   └── layout/              # App shell components
│   │   │       ├── DashboardLayout.tsx
│   │   │       ├── Header.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── pages/                   # One file per route
│   │   │   ├── DashboardPage.tsx    # Project list + stats
│   │   │   ├── DownloaderPage.tsx   # YouTube download UI
│   │   │   ├── ProjectPage.tsx      # Single project: clips, timeline
│   │   │   ├── ProjectsPage.tsx     # All projects list view
│   │   │   ├── SettingsPage.tsx     # User preferences, API keys
│   │   │   └── UploadPage.tsx       # Video upload + YouTube URL import
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useJobStatus.ts      # Polling/SSE for job progress
│   │   ├── lib/                     # Core utilities
│   │   │   └── api.ts               # Typed fetch wrapper + error handling
│   │   ├── types/                   # TypeScript type definitions
│   │   │   └── video.ts             # Video, Project types
│   │   ├── App.tsx                  # Root component + router
│   │   ├── App.css                  # App-level styles
│   │   ├── main.tsx                 # Vite entry point
│   │   └── index.css                # Tailwind directives + global styles
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── server/                          # Bun + Elysia API server
│   ├── src/
│   │   ├── routes/                  # Elysia route modules
│   │   │   ├── download.ts          # YouTube download initiation + file serving
│   │   │   ├── jobs.ts              # Job status + progress (SSE)
│   │   │   ├── projects.ts          # CRUD for video projects
│   │   │   ├── settings.ts          # User settings endpoints
│   │   │   └── upload.ts            # File upload + YouTube URL ingestion
│   │   ├── services/                # Business logic (placeholder)
│   │   ├── queue/                   # BullMQ job definitions
│   │   │   ├── connection.ts        # Redis connection for BullMQ
│   │   │   ├── events.ts            # BullMQ event listeners
│   │   │   └── producers.ts         # Job creation helpers
│   │   ├── db/                      # Database layer
│   │   │   ├── schema.ts            # Drizzle ORM schema definitions
│   │   │   ├── client.ts            # DB client setup
│   │   │   └── migrations/          # SQL migrations (Drizzle Kit)
│   │   ├── middleware/              # Elysia plugins/middleware
│   │   │   ├── error-handler.ts     # Global error handling
│   │   │   └── logger.ts            # Request/response logging
│   │   ├── lib/                     # Shared utilities (placeholder)
│   │   ├── types/                   # Server-side type definitions (placeholder)
│   │   └── index.ts                 # Entry point — wires deps, starts server
│   ├── drizzle.config.ts            # Drizzle Kit migration config
│   ├── index.ts                     # Re-export / alt entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── workers/                         # Python processing pipeline
│   ├── src/
│   │   ├── pipeline/                # Processing pipeline stages
│   │   │   ├── transcribe.py        # Whisper speech-to-text
│   │   │   ├── analyze.py           # LLM-based viral moment scoring
│   │   │   ├── clip.py              # FFmpeg clip extraction
│   │   │   ├── caption.py           # Subtitle generation + burn-in
│   │   │   ├── reframe.py           # Aspect ratio conversion (9:16)
│   │   │   ├── download_handler.py  # YouTube download via yt-dlp
│   │   │   └── utils/               # Pipeline utilities
│   │   │       └── transcript_parser.py
│   │   ├── models/                  # Data models (Pydantic)
│   │   │   ├── segment.py           # Transcript segment model
│   │   │   ├── clip.py              # Clip definition model
│   │   │   ├── download_job.py      # Download job payload model
│   │   │   └── job.py               # Job payload model
│   │   ├── services/                # External service integrations
│   │   │   ├── whisper_service.py   # Whisper model management
│   │   │   ├── llm_service.py       # LLM client (Ollama / OpenAI)
│   │   │   ├── ffmpeg_service.py    # FFmpeg command builder
│   │   │   └── youtube_service.py   # yt-dlp wrapper for downloads
│   │   ├── queue/                   # Job queue consumer
│   │   │   ├── consumer.py          # BullMQ-compatible job listener
│   │   │   └── connection.py        # Redis connection setup
│   │   ├── config.py                # Environment-based configuration
│   │   ├── logger.py                # Structured logging setup
│   │   └── main.py                  # Worker entry point
│   ├── tests/                       # Manual test suite
│   │   ├── test_analysis_manual.py
│   │   ├── test_caption_manual.py
│   │   ├── test_clip_manual.py
│   │   └── test_reframe_manual.py
│   ├── pyproject.toml               # uv / pip dependencies
│   ├── ruff.toml                    # Ruff linter config
│   └── Dockerfile
│
├── packages/                        # Shared packages
│   └── shared-types/                # Shared TypeScript types
│       └── index.ts
│
├── storage/                         # Local file storage (gitignored)
│   ├── uploads/                     # Raw uploaded videos
│   ├── clips/                       # Generated clip outputs
│   ├── downloads/                   # YouTube downloaded files
│   └── temp/                        # Intermediate processing files
│
├── docker-compose.yml               # Redis + optional services
├── dev.sh                           # Local dev startup script
├── package.json                     # Root workspace package.json
├── biome.json                       # Biome config (root-level)
├── .env.example                     # Environment variable template
├── .gitignore
├── GEMINI.md                        # This file — agent instructions
├── ARCHITECTURE.md                  # High-level architecture overview
├── PIPELINE.md                      # Processing pipeline documentation
└── README.md
```

### Separation of Concerns

- **Client** (`client/`): UI only. Handles rendering, user interactions, and API
  calls. No business logic. No direct access to the database or queue.
- **Server** (`server/`): API gateway + job orchestrator. Handles HTTP requests,
  validates input, dispatches jobs to the queue, and serves results. Does NOT
  process videos directly.
- **Workers** (`workers/`): Compute-heavy processing. Consumes jobs from the
  queue, runs the AI/video pipeline, and writes results back. Workers are
  stateless and horizontally scalable.
- **Queue** (Redis/BullMQ): The **only** communication channel between server
  and workers. Jobs flow server → queue → worker. Results flow worker →
  DB/filesystem → server → client.

### Key Architectural Rules

- The `workers/` package must **never** import from `server/` or `client/`.
  Communication is strictly through the job queue and shared storage.
- The `client/` must **never** call workers directly. All interactions go
  through the server API.
- All file paths in the database must be **relative** to the storage root, not
  absolute. This makes the system portable between local dev and cloud storage.
- Processing pipeline stages must be **idempotent** — re-running a stage with
  the same input must produce the same output without side effects.

## 6. Frontend Conventions

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS.
- **Component Library**: Build custom components in `components/ui/` and
  `components/layout/`. Customize with Tailwind for project-specific styling.
- **Routing**: React Router v6 with lazy-loaded routes.
- **State Management**: React Context for global state (auth, theme). Local
  state with `useState`/`useReducer` for component-level state. Avoid external
  state libraries unless complexity demands it.
- **API Client**: Use native `fetch` with a typed wrapper. Centralize in
  `src/lib/api.ts`. All API calls must be typed end-to-end. No need for Axios —
  both Bun and modern browsers have excellent built-in fetch.
- **Real-time Updates**: Use Server-Sent Events (SSE) for job progress updates.
  Fallback to polling if SSE is not available.
- **File conventions**:
  - **Group by type** — `components/`, `pages/`, `hooks/`, `lib/`, `types/`.
  - **One page per route** in `pages/`.
  - **Reusable components only** in `components/`. If a component is only used
    by one page, keep it in the page file until reuse is needed.
- **Error Handling**: Display user-friendly error messages. Never expose raw
  server errors, stack traces, or internal IDs to the UI.
- **Video/Media**: Use native HTML5 `<video>` element for playback. Avoid heavy
  video player libraries unless specific features (adaptive streaming, DRM) are
  required.

## 7. Server Conventions (Bun + Elysia)

- **Framework**: Elysia with Typebox for request/response validation.
- **File Uploads**: Use multipart form data. Validate file type (video MIME
  types only) and size (configurable max, default 2GB) before accepting.
  - **Pre-upload validation:** Use `fluent-ffmpeg` (ffprobe) on the server to
    verify real video duration, codecs, and resolution before queuing the job.
  - Stream uploads to disk — never buffer entire files in memory.
- **Job Dispatch**: After validating and storing an upload, immediately dispatch
  a processing job to BullMQ and return the job ID to the client. Processing is
  always async.
- **Job State Machine**: Define strict Job State Machine shared types:
  `PENDING -> TRANSCRIBING -> ANALYZING -> CLIPPING -> CAPTIONING -> REFRAMING -> COMPLETED/FAILED`.
- **SSE for Progress**: Expose an SSE endpoint (`/jobs/:id/events`) that streams
  progress updates from BullMQ job events to the client.
- **Health Checks**: Implement `/healthz` (liveness) and `/readyz` (readiness,
  checks Redis + DB connectivity).
- **Error Handling**: Use Elysia's `onError` hook for global error handling.
  Return consistent JSON error responses with `{ error: string, code: string }`.
- **Logging**: Structured JSON logs. Include request ID, method, path, status,
  and latency in every request log. Never log file contents or full request
  bodies for upload endpoints.

## 8. Worker Conventions (Python)

- **Pipeline Design**: The processing pipeline is a sequence of stages:
  1. **Transcribe** — Whisper speech-to-text with word-level timestamps.
  2. **Analyze** — LLM scores transcript segments for virality (hooks, emotional
     peaks, insights, humor).
  3. **Clip** — FFmpeg extracts segments at scored timestamps.
  4. **Caption** — Generate and burn in subtitles (SRT → hardcoded).
  5. **Reframe** — Convert to 9:16 portrait using "Smart Crop" (FFmpeg
     motion/saliency tracking, avoiding heavy external ML models).
- **YouTube Download Pipeline**: A separate job type handled by
  `download_handler.py` using `yt-dlp` via `youtube_service.py`. Downloads are
  stored in `storage/downloads/`. This pipeline is independent of the
  content-repurposing stages above.
- **Hardware Awareness**: Workers MUST support explicit device selection (`cpu`,
  `cuda`, `mps`) via environment variables to prevent crashes on GPU-less
  instances or failing to utilize available GPUs.
- **Each stage**:
  - Must be independently testable with mock inputs.
  - Must report progress back to the queue (percentage + stage name).
  - Must write its output to the filesystem and update the job metadata.
  - Must handle failures gracefully — log the error, mark the stage as failed,
    and allow retry.
- **FFmpeg**: Use `ffmpeg-python` or subprocess calls. Always set explicit
  timeouts on FFmpeg operations. Log the full FFmpeg command at DEBUG level.
- **Whisper**: Default to the `base` or `tiny` model for fast local CPU dev. Use
  `medium` or `large-v3` only in cloud/GPU production. Model selection is
  configurable via env var.
- **LLM Integration**: Abstract behind a service interface. Support both Ollama
  (local, free) and OpenAI API (cloud, paid) via configuration. Never hardcode
  API keys — always load from environment.

## 9. DevOps & Infrastructure

- **12-Factor App**: Follow [12-Factor principles](https://12factor.net/). Store
  all configuration in environment variables.
- **Docker Compose**: The default local development setup. Services:
  - `postgres` — PostgreSQL database.
  - `redis` — Job queue backend.
  - `server` — Bun + Elysia API (optional, can run natively).
  - `worker` — Python worker (optional, can run natively).
- **Environment Files**: Use `.env` for local development. Provide
  `.env.example` with all required variables documented.
- **Storage Abstraction**: The server and workers must use a storage interface
  that works with both local filesystem and S3-compatible storage. The switch is
  a single env var (`STORAGE_BACKEND=local|s3`).
- **Health Checks**: Both the server and workers must expose health check
  mechanisms. Server via HTTP endpoints. Workers via a heartbeat to Redis.

## 10. Safety & Guardrails

- **File Validation**: Validate uploaded files rigorously:
  - Check MIME type against allowlist (video/mp4, video/webm, video/quicktime).
  - Check file size against configurable maximum.
  - Run FFprobe to validate the file is a real video before processing.
- **Resource Limits**:
  - Set memory limits on FFmpeg operations.
  - Set timeouts on all external calls (LLM API, Whisper inference).
  - Limit concurrent processing jobs per worker to prevent OOM.
- **Temp File Cleanup**: All intermediate files in `storage/temp/` must be
  cleaned up after processing completes (success or failure). Use try/finally
  blocks or context managers.
- **Sensitive Data**: Never log API keys (OpenAI, Ollama endpoints) at INFO
  level. Redact or mask them. Log only at DEBUG level.
- **No Arbitrary Command Execution**: Never construct shell commands from user
  input. All FFmpeg arguments must be parameterized, never interpolated from
  user-provided strings.
