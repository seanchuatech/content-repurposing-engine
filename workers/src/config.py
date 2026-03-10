import os


class Config:
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

    # base, tiny, small, medium, large-v3
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")

    # cpu, cuda, mps
    DEVICE = os.getenv("DEVICE", "cpu")

    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
    LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama")  # ollama, openai


config = Config()
