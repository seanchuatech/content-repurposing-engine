# Content Repurposing Engine

A powerful video processing pipeline and AI-driven content tool designed to take long-form videos and repurpose them into highly engaging, short-form clips optimized for platforms like TikTok, YouTube Shorts, and Instagram Reels. 

The goal of this project is to provide a seamless, reliable, and horizontally scalable system for media processing. Built with an architecture separating the frontend client, lightweight API server, and robust parallel workers—this handles uploading, transcribing, LLM-based clip extraction, auto-captioning, and formatting all at scale, locally or in the cloud.

## Features
- **Upload & Management**: Upload large video files or use YouTube URLs directly.
- **Smart Transcription**: Automated transcription using OpenAI’s Whisper.
- **Viral Moment Analysis**: Extracts top-performing clips using LLMs to detect engagement hooks and insight density.
- **Auto Re-framing & Captioning**: Converts landscape 16:9 to portrait 9:16 format with auto-generated hardcoded subtitles.
- **Resilient Queueing**: BullMQ on top of Redis to guarantee job persistency—workers seamlessly pick up, report progress via SSE, or retry failed jobs securely.

## Tech Stack Overview
- **Client**: React 18, Vite, TypeScript, Tailwind CSS
- **Server**: Bun, Elysia, BullMQ, SQLite (Drizzle ORM)
- **Workers**: Python 3.12+, Whisper, FFmpeg, LLM API
- **Infrastructure**: Docker & Docker Compose for caching/queuing


## Getting Started Locally

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (for Redis and background processes)
- [Node.js](https://nodejs.org/) (for Frontend UI build) & [Bun](https://bun.sh/) (for API backend)
- [Python 3.12+](https://www.python.org/) & [uv](https://github.com/astral-sh/uv) (for the processing workers)
- [FFmpeg](https://ffmpeg.org/download.html) (must be accessible in your `$PATH`)

### 1. Environment Configuration
Clone the repository and set up the local variables:
```bash
cp .env.example .env
```
Fill in `.env` with API keys and preferred configuration:
- `STORAGE_BACKEND=local`
- OpenAI or Ollama keys for LLM analysis.

### 2. The Fast Way: Native Runner (Recommended)
You can boot up the entire stack concurrently (Docker Redis, Bun Server, Python Worker, and Vite Client) using our native running script.

Ensure you are at the project root and run:
```bash
./dev.sh
```
This requires `npx` (which comes with Node.js) to multiplex the terminal output, allowing you to see logs from the Client, Server, and Worker in one unified view.

### Or, The Manual Way (Step-by-Step)
If you prefer running services in separate terminal tabs for easier isolated debugging:

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

Visit the frontend server (typically `http://localhost:5173`) in your browser to interact with the engine. Upload a video to monitor progress traversing from upload processing directly to final edited clips seamlessly!
