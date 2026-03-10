import asyncio

from bullmq import Worker

from src.logger import logger
from src.queue.connection import get_redis_connection
from src.queue.consumer import process_video_job


async def main():
    logger.info("Initializing Content Repurposing Engine Worker...")
    try:
        redis_conn = await get_redis_connection()

        logger.info("Connecting to 'video-processing' queue...")
        worker = Worker(
            "video-processing", process_video_job, {"connection": redis_conn}
        )
        logger.info(f"Worker listening on generic queue {worker.name}")

        # We will initialize BullMQ consumer here
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("Worker shutting down...")
    except Exception:
        logger.exception("Worker encountered a fatal error:")


if __name__ == "__main__":
    asyncio.run(main())
