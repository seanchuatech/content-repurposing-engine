from src.logger import logger
from src.models.clip import Clip


async def analyze_transcript(transcript: dict) -> list[Clip]:
    logger.info("Analyzing transcript for viral moments...")
    # TODO: Implement LLM evaluation logic here
    return []
