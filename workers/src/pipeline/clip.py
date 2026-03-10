from src.logger import logger
from src.models.clip import Clip


async def extract_clip(video_path: str, clip: Clip) -> str:
    logger.info(f"Extracting clip {clip.id} from {video_path}")
    # TODO: Implement FFmpeg clip extraction logic here
    return f"storage/clips/{clip.id}.mp4"
