import whisper
import torch
from src.config import config
from src.logger import logger

_model = None

def get_whisper_model():
    global _model
    if _model is None:
        logger.info(f"Loading Whisper model '{config.WHISPER_MODEL}' on device '{config.DEVICE}'...")
        _model = whisper.load_model(config.WHISPER_MODEL, device=config.DEVICE)
    return _model

def transcribe_sync(video_path: str) -> dict:
    model = get_whisper_model()
    logger.info(f"Transcribing {video_path}...")
    
    # We use word_timestamps=True for better clipping precision
    result = model.transcribe(
        video_path,
        verbose=False,
        word_timestamps=True,
        fp16=(config.DEVICE == "cuda") # only use fp16 on CUDA
    )
    
    return result
