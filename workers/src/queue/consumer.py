import httpx
from bullmq import Job

from src.config import config
from src.logger import logger
from src.models.job import JobPayload, JobState
from src.pipeline.analyze import analyze_transcript
from src.pipeline.caption import generate_captions
from src.pipeline.clip import extract_clip
from src.pipeline.reframe import reframe_clip
from src.pipeline.transcribe import transcribe_video


async def update_remote_job_status(job_id: str, status: JobState, progress: int, failed_reason: str = None):
    """
    Updates the job status and progress on the server API.
    """
    url = f"{config.SERVER_URL}/jobs/{job_id}"
    payload = {
        "status": status,
        "progressPercent": progress,
    }
    if failed_reason:
        payload["failedReason"] = failed_reason

    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, json=payload)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to update remote job status: {e}")


async def save_clip_to_server(project_id: str, video_id: str, job_id: str, clip_data):
    """
    Saves a generated clip to the server database.
    """
    url = f"{config.SERVER_URL}/projects/{project_id}/clips"
    payload = {
        "id": clip_data.id,
        "videoId": video_id,
        "jobId": job_id,
        "startTime": clip_data.start_time,
        "endTime": clip_data.end_time,
        "title": clip_data.title,
        "viralityScore": clip_data.virality_score,
        "explanation": clip_data.explanation,
        "storagePath": clip_data.storage_path
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Successfully saved clip {clip_data.id} to server.")
    except Exception as e:
        logger.error(f"Failed to save clip to server: {e}")


async def process_video_job(job: Job, token: str):
    logger.info(f"Processing job {job.id} for project {job.data.get('projectId')}")
    try:
        payload = JobPayload(**job.data)
        logger.debug(f"Payload loaded: {payload}")

        # Initial Progress
        await job.updateProgress(5)
        await update_remote_job_status(payload.jobId, JobState.TRANSCRIBING, 5)

        # 1. Transcribe
        logger.info("Stage 1: Transcribing...")
        transcript = await transcribe_video(payload.jobId, payload.filePath)
        await job.updateProgress(30)
        await update_remote_job_status(payload.jobId, JobState.ANALYZING, 30)

        # 2. Analyze
        logger.info("Stage 2: Analyzing...")
        clips = await analyze_transcript(payload.jobId, transcript)
        if not clips:
            logger.warning("No clips identified during analysis.")
            await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
            return "SUCCESS_NO_CLIPS"

        await job.updateProgress(50)
        await update_remote_job_status(payload.jobId, JobState.CLIPPING, 50)

        # 3, 4, 5. Clip, Caption, Reframe
        total_clips = len(clips)
        for i, clip in enumerate(clips):
            logger.info(f"Processing clip {i+1}/{total_clips}: {clip.id}")
            
            # Clipping
            await update_remote_job_status(payload.jobId, JobState.CLIPPING, 50 + int((i / total_clips) * 15))
            raw_clip_path = await extract_clip(payload.filePath, clip)
            
            # Captioning
            await update_remote_job_status(payload.jobId, JobState.CAPTIONING, 50 + int((i / total_clips) * 15) + 5)
            captioned_path = await generate_captions(raw_clip_path, clip, transcript)
            
            # Reframing
            await update_remote_job_status(payload.jobId, JobState.REFRAMING, 50 + int((i / total_clips) * 15) + 10)
            final_path = await reframe_clip(captioned_path, clip)
            
            # Update clip storage path and save to server
            clip.storage_path = final_path
            await save_clip_to_server(payload.projectId, payload.videoId, payload.jobId, clip)

        # Final Completion
        await job.updateProgress(100)
        await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
        logger.info(f"Completed job {job.id}")
        return "SUCCESS"

    except Exception as e:
        logger.exception(f"Failed to process job {job.id}")
        # Try to mark job as failed on server
        try:
            job_id = job.data.get('jobId')
            if job_id:
                await update_remote_job_status(job_id, JobState.FAILED, 0, failed_reason=str(e))
        except:
            pass
        raise e
