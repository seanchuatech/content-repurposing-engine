import httpx
import os
import json
from bullmq import Job

from src.config import config
from src.logger import logger
from src.models.job import JobPayload, JobState
from src.models.clip import Clip
from src.pipeline.analyze import analyze_transcript
from src.pipeline.caption import generate_captions
from src.pipeline.clip import extract_clip
from src.pipeline.reframe import reframe_clip
from src.pipeline.transcribe import transcribe_video
from src.pipeline.utils.transcript_parser import parse_transcript_file
from src.services.youtube_service import download_youtube_video


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


async def update_remote_video_metadata(video_id: str, file_path: str, duration: float = None):
    """
    Updates the video metadata on the server (path and duration).
    """
    url = f"{config.SERVER_URL}/projects/videos/{video_id}"
    payload = {
        "filePath": file_path,
    }
    if duration:
        payload["durationSeconds"] = int(duration)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, json=payload)
            response.raise_for_status()
            logger.info(f"Successfully updated video metadata for {video_id}")
    except Exception as e:
        logger.error(f"Failed to update remote video metadata: {e}")


async def fetch_clip_from_server(clip_id: str) -> Clip:
    """
    Fetches a specific clip's metadata from the server.
    """
    url = f"{config.SERVER_URL}/projects/clips/{clip_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        return Clip(
            id=data["id"],
            job_id=data["jobId"],
            start_time=float(data["startTime"]),
            end_time=float(data["endTime"]),
            title=data["title"],
            virality_score=data["viralityScore"] or 0,
            explanation=data["explanation"] or ""
        )


async def fetch_global_settings() -> dict:
    """
    Fetches the global settings from the server.
    """
    url = f"{config.SERVER_URL}/settings"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch global settings: {e}")
        return {}


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

        # 0. Load settings from job payload or fallback to global overrides
        whisper_model = payload.whisperModel
        llm_backend = payload.llmBackend
        llm_model = payload.llmModel
        transcription_backend = payload.transcriptionBackend
        
        # If any are missing (e.g. older queued jobs), fetch global as fallback
        if not all([whisper_model, llm_backend, llm_model, transcription_backend]):
            settings = await fetch_global_settings()
            whisper_model = whisper_model or settings.get("whisperModel")
            llm_backend = llm_backend or settings.get("llmBackend")
            llm_model = llm_model or settings.get("llmModel")
            transcription_backend = transcription_backend or settings.get("transcriptionBackend")

        current_file_path = payload.filePath
        only_clip_id = job.data.get("onlyClipId")

        # 1. Handle YouTube Download
        if current_file_path.startswith('http'):
            logger.info(f"YouTube URL detected: {current_file_path}. Downloading...")
            await update_remote_job_status(payload.jobId, JobState.TRANSCRIBING, 2)
            downloaded_path, subtitle_path = await download_youtube_video(current_file_path, payload.jobId)
            current_file_path = downloaded_path
            
            # If YouTube provided subtitles, parse them and save to temp
            if subtitle_path and payload.useYouTubeSubtitles:
                try:
                    logger.info(f"Parsing YouTube subtitles from {subtitle_path}")
                    subtitle_path_abs = os.path.join(config.PROJECT_ROOT, subtitle_path)
                    transcript = parse_transcript_file(subtitle_path_abs)
                    
                    # Save to temp storage so other stages can find it
                    temp_dir = os.path.join(config.PROJECT_ROOT, "storage", "temp", payload.jobId)
                    os.makedirs(temp_dir, exist_ok=True)
                    transcript_path = os.path.join(temp_dir, "transcript.json")
                    with open(transcript_path, "w") as f:
                        json.dump(transcript, f, indent=2)
                    
                    logger.info("Successfully ingested YouTube subtitles. Will skip transcription.")
                except Exception as e:
                    logger.error(f"Failed to parse YouTube subtitles: {e}. Will fallback to Whisper.")
                    transcript = None
            else:
                transcript = None

            await update_remote_video_metadata(payload.videoId, current_file_path)

        # CASE A: REGENERATE SINGLE CLIP
        if only_clip_id:
            logger.info(f"Regenerating single clip: {only_clip_id}")
            clip = await fetch_clip_from_server(only_clip_id)
            
            transcript_path = os.path.join(config.PROJECT_ROOT, "storage", "temp", clip.job_id, "transcript.json")
            if not os.path.exists(transcript_path):
                logger.warning("Transcript missing for regeneration, re-transcribing...")
                transcript = await transcribe_video(payload.jobId, current_file_path, model_name=whisper_model, transcription_backend=transcription_backend)
            else:
                with open(transcript_path, "r") as f:
                    transcript = json.load(f)

            await update_remote_job_status(payload.jobId, JobState.CLIPPING, 10)
            raw_clip_path = await extract_clip(current_file_path, clip)
            
            await update_remote_job_status(payload.jobId, JobState.CAPTIONING, 40)
            captioned_path = await generate_captions(raw_clip_path, clip, transcript)
            
            await update_remote_job_status(payload.jobId, JobState.REFRAMING, 70)
            final_path = await reframe_clip(captioned_path, clip)
            
            clip.storage_path = final_path
            await save_clip_to_server(payload.projectId, payload.videoId, payload.jobId, clip)
            
            await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
            return {"status": "REGENERATION_SUCCESS"}

        # CASE B: FULL PIPELINE
        # 1. Transcribe (only if not already ingested from YouTube)
        if not transcript:
            logger.info(f"Stage 1: Transcribing {current_file_path}...")
            await update_remote_job_status(payload.jobId, JobState.TRANSCRIBING, 5)
            transcript = await transcribe_video(payload.jobId, current_file_path, model_name=whisper_model, transcription_backend=transcription_backend)
        else:
            logger.info("Stage 1: Ingested subtitles found, skipping transcription.")
        
        duration = transcript.get('segments', [])[-1].get('end', 0) if transcript.get('segments') else 0
        await update_remote_video_metadata(payload.videoId, current_file_path, duration)

        # 2. Analyze
        if payload.manualSegments:
            logger.info("Stage 2: Manual segments detected, skipping analysis.")
            await update_remote_job_status(payload.jobId, JobState.ANALYZING, 30)
            clips = [
                Clip(
                    id=f"{payload.jobId}_{i}",
                    job_id=payload.jobId,
                    start_time=s["start"],
                    end_time=s["end"],
                    title=s["title"],
                    virality_score=100,
                    explanation="Manual selection"
                )
                for i, s in enumerate(payload.manualSegments)
            ]
        else:
            logger.info("Stage 2: Analyzing...")
            await update_remote_job_status(payload.jobId, JobState.ANALYZING, 30)
            clips = await analyze_transcript(payload.jobId, transcript, llm_backend=llm_backend, llm_model=llm_model)
        
        if not clips:
            await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
            return {"status": "SUCCESS_NO_CLIPS"}

        # 3, 4, 5. Clip, Caption, Reframe
        total_clips = len(clips)
        for i, clip in enumerate(clips):
            logger.info(f"Processing clip {i+1}/{total_clips}: {clip.id}")
            await update_remote_job_status(payload.jobId, JobState.CLIPPING, 50 + int((i / total_clips) * 15))
            raw_clip_path = await extract_clip(current_file_path, clip)
            
            await update_remote_job_status(payload.jobId, JobState.CAPTIONING, 50 + int((i / total_clips) * 15) + 5)
            captioned_path = await generate_captions(raw_clip_path, clip, transcript)
            
            await update_remote_job_status(payload.jobId, JobState.REFRAMING, 50 + int((i / total_clips) * 15) + 10)
            final_path = await reframe_clip(captioned_path, clip)
            
            clip.storage_path = final_path
            await save_clip_to_server(payload.projectId, payload.videoId, payload.jobId, clip)

        await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
        logger.info(f"Completed job {job.id}")
        return {"status": "SUCCESS"}

    except Exception as e:
        logger.exception(f"Failed to process job {job.id}")
        try:
            job_id = job.data.get('jobId')
            if job_id:
                await update_remote_job_status(job_id, JobState.FAILED, 0, failed_reason=str(e))
        except:
            pass
        raise e
