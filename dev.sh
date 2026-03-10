#!/bin/bash

echo "🚀 Starting Content Repurposing Engine Native Dev Environment..."

# 1. Start Redis in the background via Docker Compose
echo "📦 Ensuring Redis is running..."
docker-compose up -d redis

# 2. Use concurrently to run the Server, Worker, and Client in parallel with prefixed, colored logs
echo "⚡ Booting up Bun Server, Python Worker, and Vite Client..."
npx --yes concurrently \
  -c "blue.bold,yellow.bold,green.bold" \
  -n "SERVER,WORKER,CLIENT" \
  "cd server && bun install && bun run dev" \
  "cd workers && uv sync && uv run python src/main.py" \
  "cd client && bun install && bun run dev"
