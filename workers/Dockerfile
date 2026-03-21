# Use a multi-stage build to get the uv binary
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    yt-dlp \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Improve network resilience for package downloads
ENV UV_HTTP_TIMEOUT=300
ENV UV_RETRIES=5


# Copy dependency files
COPY pyproject.toml uv.lock ./

# Sync dependencies using uv
RUN uv sync --frozen

# Copy source code
COPY . .

# Expose port (if worker has a status API, e.g. FastAPI)
EXPOSE 8000

# Start the worker
CMD ["uv", "run", "src/main.py"]
