import os
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

class Config:
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6380"))

    # base, tiny, small, medium, large-v3
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")

    # cpu, cuda, mps
    DEVICE = os.getenv("DEVICE", "cpu")

    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama")  # ollama, openai, gemini
    LLM_MODEL = os.getenv("LLM_MODEL", "llama3")      # llama3, gpt-4o-mini, etc.
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    TRANSCRIPTION_BACKEND = os.getenv("TRANSCRIPTION_BACKEND", "local")  # local | groq
    
    SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000/api")

    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is missing")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing")


config = Config()
