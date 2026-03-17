import asyncio
import json
import os
from src.config import config
from src.logger import logger
from src.services.whisper_service import transcribe_sync

async def transcribe_video(job_id: str, video_path_rel: str, model_name: str = None) -> dict:
    """
    Transcribes a video file using OpenAI Whisper and saves results to temp storage.
    """
    video_path_abs = os.path.join(config.PROJECT_ROOT, video_path_rel)
    
    if not os.path.exists(video_path_abs):
        logger.error(f"Video file not found at {video_path_abs}")
        raise FileNotFoundError(f"Video file not found at {video_path_abs}")

    logger.info(f"Starting transcription for {video_path_abs}")
    
    # Run Whisper in a separate thread to avoid blocking the event loop
    result = await asyncio.to_thread(transcribe_sync, video_path_abs, model_name=model_name)
    
    # Prepare temp storage directory
    temp_dir = os.path.join(config.PROJECT_ROOT, "storage", "temp", job_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    transcript_path = os.path.join(temp_dir, "transcript.json")
    
    # Save structured transcript
    with open(transcript_path, "w") as f:
        json.dump(result, f, indent=2)
    
    logger.info(f"Transcription complete. Saved to {transcript_path}")
    
    return result
