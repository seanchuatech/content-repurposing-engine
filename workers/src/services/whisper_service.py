import asyncio
import os
import subprocess
import tempfile

from groq import Groq

from src.config import config
from src.logger import logger

def _extract_audio_for_groq(video_path: str) -> str:
    """
    Extracts audio from video and compresses to FLAC (16kHz mono) to stay
    within Groq's 25MB free-tier file limit. Returns the temp file path.
    """
    temp_dir = tempfile.mkdtemp(prefix="groq_audio_")
    output_path = os.path.join(temp_dir, "audio.flac")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-ar", "16000",     # 16kHz sample rate (Whisper native)
        "-ac", "1",         # mono
        "-map", "0:a",      # audio track only
        "-c:a", "flac",     # lossless compression
        output_path
    ]

    logger.info(f"Extracting audio for Groq: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
    except subprocess.TimeoutExpired:
        raise RuntimeError("FFmpeg audio extraction timed out (300s limit)")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"FFmpeg audio extraction failed: {e.stderr.decode()}")

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    logger.info(f"Extracted audio: {file_size_mb:.1f} MB")

    if file_size_mb > 25:
        logger.warning(
            f"Audio file is {file_size_mb:.1f} MB, exceeding Groq's 25MB free-tier limit. "
            "Transcription may fail."
        )

    return output_path


def _normalize_groq_response(groq_result) -> dict:
    """
    Maps Groq's verbose_json transcription response to the standard dict format
    expected by downstream pipeline stages.
    """
    segments = []
    for seg in (groq_result.segments or []):
        segment = {
            "id": seg.id,
            "start": seg.start,
            "end": seg.end,
            "text": seg.text,
        }
        # Map word-level timestamps if available
        if hasattr(seg, "words") and seg.words:
            segment["words"] = [
                {
                    "word": w.word,
                    "start": w.start,
                    "end": w.end,
                }
                for w in seg.words
            ]
        segments.append(segment)

    return {
        "text": groq_result.text,
        "segments": segments,
        "language": getattr(groq_result, "language", "en"),
    }


def groq_transcribe_sync(video_path: str, model_name: str = None) -> dict:
    """
    Transcribes audio using the Groq API (cloud-hosted Whisper).
    """
    groq_models = ["whisper-large-v3", "whisper-large-v3-turbo"]
    target_model = model_name if model_name in groq_models else "whisper-large-v3"
    logger.info(f"Transcribing with Groq ({target_model})...")

    if not config.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set. Please set it in your .env file.")

    # 1. Extract and compress audio
    audio_path = _extract_audio_for_groq(video_path)

    try:
        # 2. Call Groq API
        client = Groq(api_key=config.GROQ_API_KEY)

        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model=target_model,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"],
                language="en",
                temperature=0.0,
            )

        # 3. Normalize to pipeline format
        result = _normalize_groq_response(transcription)
        logger.info(f"Groq transcription complete. {len(result.get('segments', []))} segments found.")
        return result

    finally:
        # Clean up temp audio file
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
                os.rmdir(os.path.dirname(audio_path))
        except OSError:
            pass

async def transcribe(video_path: str, model_name: str = None) -> dict:
    """
    Transcription router. All transcription is now handled by Groq.
    """
    return await asyncio.to_thread(groq_transcribe_sync, video_path, model_name)
