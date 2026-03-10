import asyncio

from bullmq import Queue

from src.queue.connection import get_redis_connection


async def main():
    redis_conn = await get_redis_connection()
    queue = Queue("video-processing", {"connection": redis_conn})

    print("Adding a test job to BullMQ from Python...")
    job = await queue.add(
        "process",
        {
            "jobId": "job-3",
            "projectId": "proj-1",
            "videoId": "vid-1",
            "filePath": "/some/path.mp4",
        },
        {"jobId": "job-3"}
    )
    print(f"Enqueued job {job.id}")


if __name__ == "__main__":
    asyncio.run(main())
