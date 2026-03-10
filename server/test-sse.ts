import { db } from "./src/db/client";
import { jobs, videos } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(jobs).where(eq(jobs.id, "test-sse-job"));
  await db.delete(videos).where(eq(videos.id, "test-sse-video"));
  
  await db.insert(videos).values({
    id: "test-sse-video",
    projectId: "some-project",
    storagePath: "test.mp4",
  });
  
  const job = await db.insert(jobs).values({
    id: "test-sse-job",
    projectId: "some-project",
    videoId: "test-sse-video",
    status: 0,
    progressPercent: 0
  }).returning().get();
  console.log("Created job", job);
}
main();
