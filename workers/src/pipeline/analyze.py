from src.logger import logger
from src.models.clip import Clip


async def analyze_transcript(transcript: dict) -> list[Clip]:
    logger.info("Analyzing transcript for viral moments...")
    # TODO: Implement LLM evaluation logic here
    return [
        Clip(
            id="test-clip-1",
            job_id="test-job-1",
            start_time=1.0,
            end_time=11.0,
            title="A Test Clip",
            virality_score=85,
            explanation="This is a dummy test clip.",
            storage_path=None
        )
    ]
