import asyncio

from bullmq import Worker

from src.logger import logger
from src.config import config
from src.queue.consumer import process_video_job, process_youtube_download_job

async def main():
    logger.info("Initializing Content Repurposing Engine Workers...")
    video_worker = None
    download_worker = None
    try:
        logger.info("Connecting to 'video-processing' queue...")
        
        # BullMQ Worker expects a connection dict or URL string, not a Redis instance
        redis_opts = {
            "host": config.REDIS_HOST,
            "port": config.REDIS_PORT,
        }

        video_worker = Worker(
            "video-processing", 
            process_video_job, 
            {
                "connection": redis_opts,
                "lockDuration": 300000, # 5 minutes
            }
        )
        download_worker = Worker(
            "youtube-download", 
            process_youtube_download_job, 
            {
                "connection": redis_opts,
                "lockDuration": 300000, 
            }
        )
        logger.info(f"Workers listening on queues: {video_worker.name}, {download_worker.name}")

        # Keep the main thread alive
        while True:
            await asyncio.sleep(1)

    except (asyncio.CancelledError, KeyboardInterrupt):
        logger.info("Worker received shutdown signal...")
    except Exception:
        logger.exception("Worker encountered a fatal error:")
    finally:
        if video_worker:
            logger.info("Closing video worker connection...")
            # await video_worker.close()
        if download_worker:
            logger.info("Closing download worker connection...")
            # await download_worker.close()
        logger.info("Worker process exiting.")


if __name__ == "__main__":
    asyncio.run(main())
