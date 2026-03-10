from src.logger import logger


async def transcribe_video(video_path: str) -> dict:
    logger.info(f"Starting transcription for {video_path}")
    # TODO: Implement Whisper logic here
    return {"text": "dummy transcript", "segments": []}
