from src.logger import logger
from src.models.clip import Clip


async def reframe_clip(clip_path: str, clip: Clip) -> str:
    logger.info(f"Reframing clip {clip.id} to 9:16 aspect ratio")
    # TODO: Implement Smart Crop/Reframing logic here
    return f"storage/clips/{clip.id}_reframed.mp4"
