from src.logger import logger
from src.models.clip import Clip


async def generate_captions(clip_path: str, clip: Clip) -> str:
    logger.info(f"Generating and burning in captions for {clip.id}")
    # TODO: Implement caption generation and burn-in logic here
    return f"storage/clips/{clip.id}_captioned.mp4"
