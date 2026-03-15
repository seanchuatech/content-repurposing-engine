import json
import os
from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.services.llm_service import llm_service

SYSTEM_PROMPT = """
You are an expert video editor and social media strategist. 
Your task is to analyze a video transcript and identify the most "viral" moments suitable for short-form clips (TikTok, Reels, Shorts).
"""

async def analyze_transcript(job_id: str, transcript: dict) -> list[Clip]:
    logger.info(f"Analyzing transcript for viral moments (Job: {job_id})...")
    
    # MOCKED FOR E2E TEST
    logger.info("USING MOCKED ANALYSIS RESULTS")
    return [
        Clip(
            id=f"{job_id}-clip-1",
            job_id=job_id,
            start_time=1.0,
            end_time=6.0,
            title="Mocked Clip 1",
            virality_score=95,
            explanation="Strong opening statement."
        ),
        Clip(
            id=f"{job_id}-clip-2",
            job_id=job_id,
            start_time=10.0,
            end_time=15.0,
            title="Mocked Clip 2",
            virality_score=88,
            explanation="Key insight about the topic."
        )
    ]
