import asyncio
import json
import os
import sys

from src.logger import logger
from src.queue.consumer import process_video_job, process_youtube_download_job


async def main():
    mode = os.getenv("JOB_MODE")
    payload_str = os.getenv("JOB_PAYLOAD")

    if not mode or not payload_str:
        logger.error("JOB_MODE and JOB_PAYLOAD environment variables are required.")
        sys.exit(1)

    logger.info(f"Running job: {mode}")
    try:
        payload = json.loads(payload_str)
        if mode == "video-processing":
            await process_video_job(payload)
        elif mode == "youtube-download":
            await process_youtube_download_job(payload)
        else:
            logger.error(f"Unknown job mode: {mode}")
            sys.exit(1)

        logger.info("Job completed successfully.")
        sys.exit(0)
    except Exception:
        logger.exception("Job failed:")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
