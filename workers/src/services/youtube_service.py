import os
from yt_dlp import YoutubeDL
from src.logger import logger
from src.config import config
from typing import Tuple, Optional

async def download_youtube_video(url: str, job_id: str) -> Tuple[str, Optional[str]]:
    """
    Downloads a video from YouTube and returns the relative path to the video file
    and an optional path to the downloaded subtitle file.
    """
    output_dir = os.path.join(config.PROJECT_ROOT, "storage", "uploads")
    os.makedirs(output_dir, exist_ok=True)
    
    ydl_opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": f"{output_dir}/%(id)s.%(ext)s",
        "merge_output_format": "mp4",
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en"],
        "skip_download": False,
        "quiet": False,
        "no_warnings": False,
    }

    logger.info(f"Downloading YouTube video: {url}")
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            # First extract info without downloading to check duration
            info = ydl.extract_info(url, download=False)
            duration = info.get('duration', 0)
            
            if duration > config.MAX_VIDEO_DURATION_SECONDS:
                minutes = config.MAX_VIDEO_DURATION_SECONDS // 60
                raise ValueError(f"Video duration ({duration}s) exceeds the maximum allowed limit of {minutes} minutes.")

            # Now perform the actual download
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)

            # Check for downloaded subtitles
            subtitle_path = None
            requested_subs = info.get("requested_subtitles")
            if requested_subs and "en" in requested_subs:
                sub_info = requested_subs["en"]
                if "filepath" in sub_info:
                    subtitle_path = sub_info["filepath"]
                else:
                    # Fallback: check filesystem if yt-dlp didn't populate filepath
                    # yt-dlp naming convention for subs is often {id}.{lang}.{ext}
                    base_path = os.path.splitext(video_path)[0]
                    for ext in ["vtt", "srt"]:
                        potential_path = f"{base_path}.en.{ext}"
                        if os.path.exists(potential_path):
                            subtitle_path = potential_path
                            break

            # Return relative paths for consistency with DB storage
            rel_video_path = os.path.relpath(video_path, config.PROJECT_ROOT)
            rel_subtitle_path = os.path.relpath(subtitle_path, config.PROJECT_ROOT) if subtitle_path else None
            
            logger.info(f"Successfully downloaded YouTube video to {rel_video_path}")
            if rel_subtitle_path:
                logger.info(f"Found subtitles at {rel_subtitle_path}")
            
            return rel_video_path, rel_subtitle_path
            
    except Exception as e:
        logger.error(f"Failed to download YouTube video: {e}")
        raise e
