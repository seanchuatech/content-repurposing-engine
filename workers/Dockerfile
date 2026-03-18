FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    yt-dlp \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Sync dependencies using uv
RUN uv sync --frozen

# Copy source code
COPY . .

# Expose port (if worker has a status API, e.g. FastAPI)
EXPOSE 8000

# Start the worker
CMD ["uv", "run", "src/main.py"]
