from bullmq import Job

from src.logger import logger
from src.models.job import JobPayload
from src.pipeline.analyze import analyze_transcript
from src.pipeline.caption import generate_captions
from src.pipeline.clip import extract_clip
from src.pipeline.reframe import reframe_clip
from src.pipeline.transcribe import transcribe_video


async def update_job_progress(job: JobPayload, progress: int):
    # Depending on our setup, we can call back to the Elysia API
    # Or just use BullMQ's native progress which the server reads.
    # BullMQ natively tracks progress (0-100 or object)
    pass


async def process_video_job(job: Job, token: str):
    logger.info(f"Processing job {job.id} for project {job.data.get('projectId')}")
    try:
        payload = JobPayload(**job.data)
        logger.debug(f"Payload loaded: {payload}")

        # We update progress to signal we picked it up
        await job.updateProgress(10)

        # Pipeline execution goes here...
        # 1. Transcribe
        transcript = await transcribe_video(payload.jobId, payload.filePath)
        await job.updateProgress(30)

        # 2. Analyze
        clips = await analyze_transcript(transcript)
        await job.updateProgress(50)

        # 3. Clip
        for clip in clips:
            clip_path = await extract_clip(payload.filePath, clip)
            # 4. Caption
            captioned_path = await generate_captions(clip_path, clip)
            # 5. Reframe
            final_path = await reframe_clip(captioned_path, clip)
            clip.storage_path = final_path

        await job.updateProgress(100)
        logger.info(f"Completed job {job.id}")
        return "SUCCESS"

    except Exception as e:
        logger.exception(f"Failed to process job {job.id}")
        raise e
