#!/bin/bash

# Exit on any failure
set -e

echo "🚀 Starting Content Repurposing Engine Native Dev Environment..."

# 1. Start Infrastructure in the background via Docker Compose
echo "📦 Ensuring Redis and DB UI are running..."
if ! docker compose up -d redis db-ui; then
    echo "❌ Failed to start infrastructure via Docker Compose."
    echo "Check if Docker is running and if there are port conflicts (e.g., port 6380 for Redis)."
    exit 1
fi

# 2. Install dependencies once at the root (Bun workspace handles subfolders)
echo "📦 Installing dependencies..."
bun install

# 3. Use concurrently to run the Server, Worker, and Client in parallel
echo "⚡ Booting up Bun Server, Python Worker, and Vite Client..."
npx --yes concurrently \
  -c "blue.bold,yellow.bold,green.bold" \
  -n "SERVER,WORKER,CLIENT" \
  --kill-others \
  "cd server && bun run dev" \
  "cd workers && uv sync && PYTHONPATH=. uv run python src/main.py" \
  "cd client && bun run dev"
