import os

from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.services.ffmpeg_service import ffmpeg_service


async def reframe_clip(captioned_path_rel: str, clip: Clip) -> str:
    """
    Converts a clip to 9:16 portrait aspect ratio.
    """
    logger.info(f"Reframing clip {clip.id} to 9:16")

    input_path_abs = os.path.join(config.PROJECT_ROOT, captioned_path_rel)
    output_filename = f"{clip.id}_final.mp4"
    output_path_abs = os.path.join(
        config.PROJECT_ROOT, "storage", "clips", output_filename
    )

    await ffmpeg_service.reframe_to_916(input_path_abs, output_path_abs)

    return os.path.relpath(output_path_abs, config.PROJECT_ROOT)
