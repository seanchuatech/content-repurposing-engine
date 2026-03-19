import asyncio

from bullmq import Worker

from src.logger import logger
from src.config import config
from src.queue.consumer import process_video_job


async def main():
    logger.info("Initializing Content Repurposing Engine Worker...")
    worker = None
    try:
        logger.info("Connecting to 'video-processing' queue...")
        
        # BullMQ Worker expects a connection dict or URL string, not a Redis instance
        redis_opts = {
            "host": config.REDIS_HOST,
            "port": config.REDIS_PORT,
        }

        worker = Worker(
            "video-processing", 
            process_video_job, 
            {
                "connection": redis_opts,
                "lockDuration": 300000, # 5 minutes
            }
        )
        logger.info(f"Worker listening on queue: {worker.name}")

        # Keep the main thread alive
        while True:
            await asyncio.sleep(1)

    except (asyncio.CancelledError, KeyboardInterrupt):
        logger.info("Worker received shutdown signal...")
    except Exception:
        logger.exception("Worker encountered a fatal error:")
    finally:
        if worker:
            logger.info("Closing worker connections...")
            # We don't necessarily need to close here as the process will exit, 
            # but it's good practice if bullmq-python supports it.
            # worker.close() 
        logger.info("Worker process exiting.")


if __name__ == "__main__":
    asyncio.run(main())
