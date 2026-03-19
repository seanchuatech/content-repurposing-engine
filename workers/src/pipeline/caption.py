import os
from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.services.ffmpeg_service import ffmpeg_service

def format_timestamp(seconds: float) -> str:
    """Formats seconds into SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

async def generate_captions(clip_path_rel: str, clip: Clip, transcript: dict) -> str:
    """
    Generates an SRT file from transcript segments and burns it into the video.
    """
    logger.info(f"Generating captions for clip {clip.id}")
    
    # 1. Extract relevant words/segments for this clip
    # Whisper with word_timestamps=True provides "words" in segments
    # or sometimes a top-level "words" list depending on the version.
    all_words = []
    for segment in transcript.get("segments", []):
        if "words" in segment:
            all_words.extend(segment["words"])
    
    if not all_words:
        # Fallback to segments if word-level data is missing
        all_words = transcript.get("segments", [])

    # Filter words within the clip's timeframe (including 3s padding)
    padded_end_time = clip.end_time + 3.0
    clip_words = [
        w for w in all_words 
        if w.get("start", 0) >= clip.start_time and w.get("end", 0) <= padded_end_time
    ]
    
    if not clip_words:
        logger.warning(f"No words found for clip {clip.id} between {clip.start_time} and {clip.end_time}")
        return clip_path_rel # Return original if no captions

    # 2. Create SRT content
    srt_lines = []
    for i, word in enumerate(clip_words):
        # Adjust timestamps to be relative to the clip's start
        start = max(0, word["start"] - clip.start_time)
        end = max(0, word["end"] - clip.start_time)
        
        text = word.get("word", word.get("text", "")).strip()
        
        srt_lines.append(f"{i + 1}")
        srt_lines.append(f"{format_timestamp(start)} --> {format_timestamp(end)}")
        srt_lines.append(text)
        srt_lines.append("") # Empty line between entries

    srt_content = "\n".join(srt_lines)
    
    # 3. Save SRT to temp storage
    temp_dir = os.path.join(config.PROJECT_ROOT, "storage", "temp", clip.job_id)
    os.makedirs(temp_dir, exist_ok=True)
    srt_path = os.path.join(temp_dir, f"{clip.id}.srt")
    
    with open(srt_path, "w") as f:
        f.write(srt_content)
    
    # 4. Burn subtitles into video
    input_path_abs = os.path.join(config.PROJECT_ROOT, clip_path_rel)
    output_filename = f"{clip.id}_captioned.mp4"
    output_path_abs = os.path.join(config.PROJECT_ROOT, "storage", "clips", output_filename)
    
    # We need an absolute path for the subtitles filter to work reliably
    await ffmpeg_service.burn_subtitles(input_path_abs, output_path_abs, srt_path)
    
    return os.path.relpath(output_path_abs, config.PROJECT_ROOT)
