import whisper
import torch
from src.config import config
from src.logger import logger

_current_model_name = None
_model = None

def get_whisper_model(model_name: str = None):
    global _model, _current_model_name
    
    target_model = model_name or config.WHISPER_MODEL
    
    if _model is None or _current_model_name != target_model:
        logger.info(f"Loading Whisper model '{target_model}' on device '{config.DEVICE}'...")
        _model = whisper.load_model(target_model, device=config.DEVICE)
        _current_model_name = target_model
        
    return _model

def transcribe_sync(video_path: str, model_name: str = None) -> dict:
    model = get_whisper_model(model_name)
    logger.info(f"Transcribing {video_path} using {model_name or config.WHISPER_MODEL}...")
    
    # We use word_timestamps=True for better clipping precision
    result = model.transcribe(
        video_path,
        verbose=False,
        word_timestamps=True,
        fp16=(config.DEVICE == "cuda") # only use fp16 on CUDA
    )
    
    return result
