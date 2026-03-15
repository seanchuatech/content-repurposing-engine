import os
from yt_dlp import YoutubeDL
from src.logger import logger
from src.config import config

async def download_youtube_video(url: str, job_id: str) -> str:
    """
    Downloads a video from YouTube and returns the relative path to the file.
    """
    output_dir = os.path.join("storage", "uploads")
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename using job_id
    filename = f"yt_{job_id}.mp4"
    output_path = os.path.join(output_dir, filename)
    absolute_output_path = os.path.abspath(os.path.join(os.getcwd(), "..", output_path))

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': absolute_output_path,
        'quiet': False,
        'no_warnings': False,
    }

    logger.info(f"Downloading YouTube video: {url}")
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        if not os.path.exists(absolute_output_path):
            # Sometimes extension might differ if not forced correctly
            for f in os.listdir(os.path.dirname(absolute_output_path)):
                if f.startswith(f"yt_{job_id}"):
                    actual_path = os.path.join(output_dir, f)
                    logger.info(f"Found downloaded file at alternative path: {actual_path}")
                    return actual_path
            raise FileNotFoundError(f"Downloaded file not found at {absolute_output_path}")

        logger.info(f"Successfully downloaded YouTube video to {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Failed to download YouTube video: {e}")
        raise e
