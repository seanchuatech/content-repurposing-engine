#!/bin/bash
bun run src/index.ts &
SERVER_PID=$!
sleep 2

# Start curl and capture output to file
curl -N http://localhost:3000/api/jobs/test-sse-job/events > curl_out.txt 2>&1 &
CURL_PID=$!
sleep 1

# Update job status
bun run update-sse.ts
sleep 3

kill $CURL_PID 2>/dev/null || true
kill $SERVER_PID 2>/dev/null || true

cat curl_out.txt
