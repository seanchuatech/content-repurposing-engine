import { db } from "./src/db/client";
import { jobs } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.update(jobs).set({ progressPercent: 50 }).where(eq(jobs.id, "test-sse-job"));
  console.log("Updated job to 50%");
  await new Promise(r => setTimeout(r, 2000));
  await db.update(jobs).set({ progressPercent: 100, status: 5 }).where(eq(jobs.id, "test-sse-job"));
  console.log("Updated job to 100% (COMPLETED)");
}
main();
