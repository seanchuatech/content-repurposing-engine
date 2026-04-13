#!/bin/bash

# Exit on any failure
set -e

echo "🚀 Starting Content Repurposing Engine Native Dev Environment..."

# 1. Start Infrastructure in the background via Docker Compose
echo "📦 Ensuring PostgreSQL and DB UI are running..."
if ! docker compose up -d postgres db-ui; then
    echo "❌ Failed to start infrastructure via Docker Compose."
    echo "Check if Docker is running and if there are port conflicts (e.g., port 5432 for Postgres)."
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing TS dependencies..."
bun install

echo "📦 Syncing Python worker dependencies..."
cd workers && uv sync && cd ..

# 3. Use concurrently to run the Server and Client in parallel
echo "⚡ Booting up Bun Server and Vite Client..."
echo "ℹ️ Note: Python workers will be spawned on-demand by the server when jobs are triggered!"
npx --yes concurrently \
  -c "blue.bold,green.bold" \
  -n "SERVER,CLIENT" \
  --kill-others \
  "cd server && bun run --env-file=../.env dev" \
  "cd client && bun run dev"
