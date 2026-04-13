import json
import os
from typing import Any, cast

import httpx

from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.models.download_job import DownloadJobPayload
from src.models.job import JobPayload, JobState
from src.pipeline.analyze import analyze_transcript
from src.pipeline.caption import generate_captions
from src.pipeline.clip import extract_clip
from src.pipeline.download_handler import process_youtube_download
from src.pipeline.reframe import reframe_clip
from src.pipeline.transcribe import transcribe_video
from src.pipeline.utils.transcript_parser import parse_transcript_file
from src.services.ffmpeg_service import ffmpeg_service
from src.services.storage_service import storage_service
from src.services.youtube_service import download_youtube_video
from src.utils.api import get_auth_headers


async def update_remote_job_status(
    job_id: str,
    status: JobState,
    progress: int,
    failed_reason: str | None = None,
):
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
        async with httpx.AsyncClient(headers=get_auth_headers()) as client:
            response = await client.patch(url, json=payload)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to update remote job status: {e}")


async def update_remote_video_metadata(
    video_id: str, file_path: str, duration: float | None = None
):
    """
    Updates the video metadata on the server (path and duration).
    """
    url = f"{config.SERVER_URL}/projects/videos/{video_id}"
    payload: dict[str, Any] = {
        "filePath": file_path,
    }
    if duration is not None:
        payload["durationSeconds"] = int(duration)

    try:
        async with httpx.AsyncClient(headers=get_auth_headers()) as client:
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
    async with httpx.AsyncClient(headers=get_auth_headers()) as client:
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
            explanation=data["explanation"] or "",
        )


async def fetch_global_settings() -> dict:
    """
    Fetches the global settings from the server.
    """
    url = f"{config.SERVER_URL}/settings"
    try:
        async with httpx.AsyncClient(headers=get_auth_headers()) as client:
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
        "storagePath": clip_data.storage_path,
    }

    try:
        async with httpx.AsyncClient(headers=get_auth_headers()) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Successfully saved clip {clip_data.id} to server.")
    except Exception as e:
        logger.error(f"Failed to save clip to server: {e}")


async def _handle_ingestion(
    payload: JobPayload,
) -> tuple[str, dict | None]:
    """
    Handles the ingestion stage (YouTube download or local file check).
    Returns (current_file_path, transcript).
    """
    current_file_path = payload.filePath

    # 1. Handle YouTube Download
    if current_file_path.startswith("http"):
        logger.info(f"YouTube URL detected: {current_file_path}. Downloading...")
        await update_remote_job_status(payload.jobId, JobState.TRANSCRIBING, 2)
        downloaded_path, subtitle_path = await download_youtube_video(
            current_file_path, payload.jobId
        )

        # Upload the downloaded video to S3 if needed
        storage_service.upload_if_s3(
            os.path.join(config.PROJECT_ROOT, downloaded_path), downloaded_path
        )
        current_file_path = downloaded_path

        # If YouTube provided subtitles, parse them and save to temp
        transcript = None
        if subtitle_path and payload.useYouTubeSubtitles:
            try:
                logger.info(f"Parsing YouTube subtitles from {subtitle_path}")
                subtitle_path_abs = os.path.join(config.PROJECT_ROOT, subtitle_path)
                transcript = parse_transcript_file(subtitle_path_abs)

                # Save to temp storage so other stages can find it
                temp_dir = os.path.join(
                    config.PROJECT_ROOT, "storage", "temp", payload.jobId
                )
                os.makedirs(temp_dir, exist_ok=True)
                transcript_path = os.path.join(temp_dir, "transcript.json")
                with open(transcript_path, "w") as f:
                    json.dump(transcript, f, indent=2)
                storage_service.upload_if_s3(
                    transcript_path,
                    os.path.relpath(transcript_path, config.PROJECT_ROOT),
                )

                logger.info(
                    "Successfully ingested YouTube subtitles. Will skip transcription."
                )
            except Exception as e:
                logger.error(
                    f"Failed to parse YouTube subtitles: {e}. Will fallback to Whisper."
                )
                transcript = None

        await update_remote_video_metadata(payload.videoId, current_file_path)
        return current_file_path, transcript

    # 2. Download file from S3 if needed
    current_file_path_abs = storage_service.download_if_s3(current_file_path)

    # Check duration for local file uploads
    try:
        info = await ffmpeg_service.get_video_info(current_file_path_abs)
        format_info = info.get("format", {})
        duration_val = format_info.get("duration")
        duration = float(duration_val) if duration_val is not None else 0.0

        if duration > config.MAX_VIDEO_DURATION_SECONDS:
            minutes = config.MAX_VIDEO_DURATION_SECONDS // 60
            raise ValueError(
                f"Video duration ({duration}s) exceeds the maximum "
                f"allowed limit of {minutes} minutes."
            )
    except Exception as e:
        logger.error(f"Failed to check video duration for local file: {e}")
        raise e

    return current_file_path, None


async def _handle_regeneration(
    payload: JobPayload,
    current_file_path: str,
    only_clip_id: str,
    whisper_model: str,
) -> dict:
    """Handles regenerating a single clip metadata and media."""
    logger.info(f"Regenerating single clip: {only_clip_id}")
    clip = await fetch_clip_from_server(only_clip_id)

    transcript_path_rel = os.path.join(
        "storage", "temp", clip.job_id, "transcript.json"
    )
    transcript_path = storage_service.download_if_s3(transcript_path_rel)

    if not os.path.exists(transcript_path):
        logger.warning("Transcript missing for regeneration, re-transcribing...")
        transcript = await transcribe_video(
            payload.jobId, current_file_path, model_name=whisper_model
        )
    else:
        with open(transcript_path) as f:
            transcript = json.load(f)

    await update_remote_job_status(payload.jobId, JobState.CLIPPING, 10)
    raw_clip_path = await extract_clip(current_file_path, clip)

    await update_remote_job_status(payload.jobId, JobState.CAPTIONING, 40)
    captioned_path = await generate_captions(raw_clip_path, clip, transcript)

    await update_remote_job_status(payload.jobId, JobState.REFRAMING, 70)
    final_path = await reframe_clip(captioned_path, clip)

    storage_service.upload_if_s3(
        os.path.join(config.PROJECT_ROOT, final_path), final_path
    )
    clip.storage_path = final_path
    await save_clip_to_server(payload.projectId, payload.videoId, payload.jobId, clip)

    await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
    return {"status": "REGENERATION_SUCCESS"}


async def process_video_job(job_data: dict):
    job_id = job_data.get("jobId")

    logger.info(f"Processing job {job_id} for project {job_data.get('projectId')}")
    try:
        payload = JobPayload(**job_data)
        logger.debug(f"Payload loaded: {payload}")

        # 0. Load settings from job payload or fallback to global overrides
        whisper_model = payload.whisperModel
        llm_backend = payload.llmBackend
        llm_model = payload.llmModel

        # If any are missing (e.g. older queued jobs), fetch global as fallback
        if not all([whisper_model, llm_backend, llm_model]):
            settings = await fetch_global_settings()
            whisper_model = whisper_model or settings.get("whisperModel")
            llm_backend = llm_backend or settings.get("llmBackend")
            llm_model = llm_model or settings.get("llmModel")

        only_clip_id = job_data.get("onlyClipId")

        # 1. Handle Ingestion (Download/Check)
        current_file_path, transcript = await _handle_ingestion(payload)

        # CASE A: REGENERATE SINGLE CLIP
        if only_clip_id:
            return await _handle_regeneration(
                payload, current_file_path, only_clip_id, cast(str, whisper_model)
            )

        # CASE B: FULL PIPELINE
        # 1. Transcribe (only if not already ingested from YouTube)
        if not transcript:
            logger.info(f"Stage 1: Transcribing {current_file_path}...")
            await update_remote_job_status(payload.jobId, JobState.TRANSCRIBING, 5)
            transcript = await transcribe_video(
                payload.jobId, current_file_path, model_name=cast(str, whisper_model)
            )

            # Save transcript to temp and upload to S3
            temp_dir = os.path.join(
                config.PROJECT_ROOT, "storage", "temp", payload.jobId
            )
            os.makedirs(temp_dir, exist_ok=True)
            transcript_path = os.path.join(temp_dir, "transcript.json")
            with open(transcript_path, "w") as f:
                json.dump(transcript, f, indent=2)
            storage_service.upload_if_s3(
                transcript_path, os.path.relpath(transcript_path, config.PROJECT_ROOT)
            )
        else:
            logger.info("Stage 1: Ingested subtitles found, skipping transcription.")

        duration = (
            transcript.get("segments", [])[-1].get("end", 0)
            if transcript.get("segments")
            else 0
        )
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
                    explanation="Manual selection",
                )
                for i, s in enumerate(payload.manualSegments)
            ]
        else:
            logger.info("Stage 2: Analyzing...")
            await update_remote_job_status(payload.jobId, JobState.ANALYZING, 30)
            clips = await analyze_transcript(
                payload.jobId,
                transcript,
                llm_backend=cast(str, llm_backend),
                llm_model=cast(str, llm_model),
            )

        if not clips:
            await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
            return {"status": "SUCCESS_NO_CLIPS"}

        # 3, 4, 5. Clip, Caption, Reframe
        total_clips = len(clips)
        for i, clip in enumerate(clips):
            logger.info(f"Processing clip {i + 1}/{total_clips}: {clip.id}")
            progress_base = 50 + int((i / total_clips) * 15)
            await update_remote_job_status(
                payload.jobId, JobState.CLIPPING, progress_base
            )
            raw_clip_path = await extract_clip(current_file_path, clip)

            await update_remote_job_status(
                payload.jobId, JobState.CAPTIONING, progress_base + 5
            )
            captioned_path = await generate_captions(raw_clip_path, clip, transcript)

            await update_remote_job_status(
                payload.jobId, JobState.REFRAMING, progress_base + 10
            )
            final_path = await reframe_clip(captioned_path, clip)

            storage_service.upload_if_s3(
                os.path.join(config.PROJECT_ROOT, final_path), final_path
            )
            clip.storage_path = final_path
            await save_clip_to_server(
                payload.projectId, payload.videoId, payload.jobId, clip
            )

        await update_remote_job_status(payload.jobId, JobState.COMPLETED, 100)
        logger.info(f"Completed job {job_id}")
        return {"status": "SUCCESS"}

    except Exception as e:
        logger.exception(f"Failed to process job {job_id}")
        try:
            target_job_id = job_data.get("jobId")
            if target_job_id:
                await update_remote_job_status(
                    target_job_id, JobState.FAILED, 0, failed_reason=str(e)
                )
        except Exception:
            pass
        raise e


async def process_youtube_download_job(job_data: dict):
    job_id = job_data.get("downloadId")

    logger.info(f"Received youtube download job {job_id}")
    try:
        payload = DownloadJobPayload(**job_data)
        await process_youtube_download(payload)
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        raise e
