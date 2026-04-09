# Content Repurposing Engine

A powerful video processing pipeline and AI-driven content tool designed to take
long-form videos and repurpose them into highly engaging, short-form clips
optimized for platforms like TikTok, YouTube Shorts, and Instagram Reels.

The goal of this project is to provide a seamless, reliable, and horizontally
scalable system for media processing. Built with an architecture separating the
frontend client, lightweight API server, and robust parallel workers—this
handles uploading, transcribing, LLM-based clip extraction, auto-captioning, and
formatting all at scale, locally or in the cloud.

## Features

- **Upload & Management**: Upload large video files or use YouTube URLs
  directly.
- **Smart Transcription**: Automated transcription using local OpenAI Whisper or
  cloud-based Groq API (free tier available).
- **Viral Moment Analysis**: Extracts top-performing clips using LLMs to detect
  engagement hooks and insight density.
- **Auto Re-framing & Captioning**: Converts landscape 16:9 to portrait 9:16
  format with auto-generated hardcoded subtitles.
- **Event-Driven Architecture**: Ephemeral workers are spawned on-demand for processing, automatically reporting progress via SSE and cleanly exiting upon completion, ensuring efficient resource usage without long-running daemons.

## Tech Stack Overview

- **Client**: React 18, Vite, TypeScript, Tailwind CSS
- **Server**: Bun, Elysia, BullMQ, SQLite (Drizzle ORM)
- **Workers**: Python 3.12+, Whisper, FFmpeg, LLM API
- **Infrastructure**: Docker & Docker Compose for caching/queuing

## Getting Started Locally

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for Redis and background
  processes)
- [Node.js](https://nodejs.org/) (for Frontend UI build) &
  [Bun](https://bun.sh/) (for API backend)
- [Python 3.12+](https://www.python.org/) &
  [uv](https://github.com/astral-sh/uv) (for the processing workers)
- [FFmpeg](https://ffmpeg.org/download.html) (must be accessible in your
  `$PATH`)

### 1. Environment Configuration

Clone the repository and set up the local variables:

```bash
cp .env.example .env
```

Fill in `.env` with API keys and preferred configuration:

- `STORAGE_BACKEND=local`
- `TRANSCRIPTION_BACKEND=local` (or `groq` for cloud transcription)
- Groq, OpenAI, Gemini, or Ollama keys for transcription and LLM analysis.

### 2. The Fast Way: Native Runner (Recommended)

You can boot up the entire stack concurrently (Docker Redis, Bun Server, Python
Worker, and Vite Client) using our native running script.

Ensure you are at the project root and run:

```bash
./dev.sh
```

This requires `npx` (which comes with Node.js) to multiplex the terminal output,
allowing you to see logs from the Client, Server, and Worker in one unified
view.

### Or, The Manual Way (Step-by-Step)

If you prefer running services in separate terminal tabs for easier isolated
debugging:

**Start Redis:**

```bash
docker-compose up -d redis
```

**Run the Backend API Server:**

```bash
cd server
bun install
bun run dev
```

**Run the Pipeline Worker:**

```bash
cd workers
uv sync
uv run python src/main.py
```

**Run the Client Web Interface:**

```bash
cd client
npm install
npm run dev
```

**Testing Stripe Webhooks (Optional):**

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Login with `stripe login`.
3. Forward events to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```
4. Update `STRIPE_WEBHOOK_SECRET` in your `.env` with the signing secret (`whsec_...`) provided by the CLI output.

Visit the frontend server (typically `http://localhost:5173`) in your browser to
interact with the engine. Upload a video to monitor progress traversing from
upload processing directly to final edited clips seamlessly!

# Video Processing Workers

The worker service handles compute-heavy AI tasks: transcription, viral moment
analysis, clipping, and captioning.

## 🛠️ Prerequisites

- **Python 3.12+**
- **FFmpeg** (installed on host for local run)
- **yt-dlp** (installed on host for local run)
- **[uv](https://github.com/astral-sh/uv)** (recommended for dependency
  management)

## 🚀 How to Run

### Option 1: Docker (Recommended)

1. From the project root:
   ```bash
   docker compose up --build -d worker
   ```

### Option 2: Local Development
...

Use this for faster iteration and debugging.

1. **Install dependencies**:
   ```bash
   uv sync
   ```
2. **Environment Setup**: Ensure your root `.env` has the correct `OLLAMA_URL`
   (usually `http://localhost:11434`).
3. **Start the worker**:
   ```bash
   uv run src/main.py
   ```

## ⚙️ Configuration

Key environment variables in `.env`:

- `WHISPER_MODEL`: `whisper-large-v3`, `whisper-large-v3-turbo` (Groq).
- `TRANSCRIPTION_BACKEND`: `groq` (cloud API).
- `GROQ_API_KEY`: API key for Groq cloud transcription (get one free at
  [console.groq.com](https://console.groq.com/keys)).
- `LLM_MODEL`: The model name to use for analysis (default: `gpt-4o`).

## 📁 Pipeline Stages

1. **Transcribe**: Groq Cloud API (Whisper Large V3).
2. **Analyze**: Gemini/OpenAI virality scoring.
3. **Clip**: FFmpeg segment extraction.
4. **Caption**: Hardcoded subtitle burn-in.
5. **Reframe**: 9:16 portrait conversion.
