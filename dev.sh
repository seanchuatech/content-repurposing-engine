#!/bin/bash

echo "🚀 Starting Content Repurposing Engine Native Dev Environment..."

# 1. Start Infrastructure in the background via Docker Compose
echo "📦 Ensuring Redis, Ollama, and DB UI are running..."
docker compose up -d redis ollama db-ui

# 2. Install dependencies once at the root (Bun workspace handles subfolders)
echo "📦 Installing dependencies..."
bun install

# 3. Use concurrently to run the Server, Worker, and Client in parallel
echo "⚡ Booting up Bun Server, Python Worker, and Vite Client..."
npx --yes concurrently \
  -c "blue.bold,yellow.bold,green.bold" \
  -n "SERVER,WORKER,CLIENT" \
  "cd server && bun run dev" \
  "cd workers && uv sync && PYTHONPATH=. uv run python src/main.py" \
  "cd client && bun run dev"
