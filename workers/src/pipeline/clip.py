import os

from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.services.ffmpeg_service import ffmpeg_service


async def extract_clip(video_path_rel: str, clip: Clip) -> str:
    """
    Extracts a clip from the original video based on start and end times.
    """
    video_path_abs = os.path.join(config.PROJECT_ROOT, video_path_rel)

    # Define output path
    # clips are stored in storage/clips/
    clips_dir = os.path.join(config.PROJECT_ROOT, "storage", "clips")
    os.makedirs(clips_dir, exist_ok=True)

    output_filename = f"{clip.id}_raw.mp4"  # Raw clip before captioning/reframing
    output_path_abs = os.path.join(clips_dir, output_filename)

    # Add 3 seconds to end_time to avoid abrupt cuts
    padded_end_time = clip.end_time + 3.0

    logger.info(
        f"Extracting clip {clip.id} ({clip.start_time}s - {padded_end_time}s) "
        f"from {video_path_abs}"
    )

    await ffmpeg_service.extract_segment(
        video_path_abs, output_path_abs, clip.start_time, padded_end_time
    )

    # Return path relative to PROJECT_ROOT for consistency
    return os.path.relpath(output_path_abs, config.PROJECT_ROOT)
