import os

from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


class Config:
    # base, tiny, small, medium, large-v3
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")

    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    LLM_BACKEND = os.getenv("LLM_BACKEND", "gemini-1.5-flash")  # gemini, openai
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-1.5-flash")  # gpt-4o-mini, etc.
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    MAX_VIDEO_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", 900))

    SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000/api")

    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is missing")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing")


config = Config()
