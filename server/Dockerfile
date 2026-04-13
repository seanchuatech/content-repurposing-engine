FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY packages/ ./packages/

# Install dependencies at the workspace root
RUN bun install

# Copy source code for server
COPY server ./server

# Change workdir to server to run the application
WORKDIR /app/server

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
