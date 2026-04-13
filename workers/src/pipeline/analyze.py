import json
import os

from src.config import config
from src.logger import logger
from src.models.clip import Clip
from src.services.llm_service import llm_service

SYSTEM_PROMPT = """
You are an expert video editor and social media strategist.
Your task is to analyze a video transcript and identify the most "viral"
moments suitable for short-form clips (TikTok, Reels, Shorts).

For each viral moment, you must provide:
1. Start and End timestamps (seconds).
2. A hook-driven, catchy title.
3. A virality score (1-100).
4. A brief explanation of why this moment is engaging.

Output your response as a JSON object with a "clips" key
containing an array of these objects.
"""

PROMPT_TEMPLATE = """
Analyze the following video transcript. Identify 2 to 5 high-potential clips.
Segments should ideally be 15 to 60 seconds long.

TRANSCRIPT:
{transcript_text}

JSON output format:
{{
  "clips": [
    {{
      "start_time": 12.5,
      "end_time": 45.0,
      "title": "The Secret to Viral Growth",
      "virality_score": 92,
      "explanation": (
          "Strong hook with a counter-intuitive insight "
          "that challenges common beliefs."
      )
    }}
  ]
}}
"""


async def analyze_transcript(
    job_id: str,
    transcript: dict,
    llm_backend: str | None = None,
    llm_model: str | None = None,
) -> list[Clip]:
    logger.info(f"Analyzing transcript for viral moments (Job: {job_id})...")

    # 1. Extract text from transcript
    # Whisper format usually has a 'text' key for the full transcript
    transcript_text = transcript.get("text", "")

    # If text is too long, we might need to truncate or chunk (LLM context window)
    # For now, let's take the first 10k characters which is plenty for 15-20 mins
    if len(transcript_text) > 12000:
        logger.info("Transcript too long, truncating for LLM analysis.")
        transcript_text = transcript_text[:12000] + "..."

    # 2. Call LLM
    prompt = PROMPT_TEMPLATE.format(transcript_text=transcript_text)

    try:
        result = await llm_service.generate_json(
            prompt, SYSTEM_PROMPT, backend=llm_backend, model=llm_model
        )
        raw_clips = result.get("clips", [])

        clips = []
        for i, rc in enumerate(raw_clips):
            clip = Clip(
                id=f"{job_id}-clip-{i + 1}",
                job_id=job_id,
                start_time=float(rc.get("start_time", 0)),
                end_time=float(rc.get("end_time", 0)),
                title=rc.get("title", f"Clip {i + 1}"),
                virality_score=int(rc.get("virality_score", 50)),
                explanation=rc.get("explanation", ""),
            )
            clips.append(clip)

        # 3. Save analysis to temp storage
        temp_dir = os.path.join(config.PROJECT_ROOT, "storage", "temp", job_id)
        os.makedirs(temp_dir, exist_ok=True)
        analysis_path = os.path.join(temp_dir, "analysis.json")

        with open(analysis_path, "w") as f:
            json.dump(result, f, indent=2)

        logger.info(
            f"Analysis complete. Identified {len(clips)} clips. "
            f"Saved to {analysis_path}"
        )
        return clips

    except Exception as e:
        logger.error(f"Transcript analysis failed: {e}")
        # Fallback to mocked results if AI fails,
        # so the pipeline doesn't break during dev
        logger.warning(
            "AI Analysis failed. Falling back to mocked results "
            "for pipeline continuity."
        )
        return [
            Clip(
                id=f"{job_id}-fallback-1",
                job_id=job_id,
                start_time=5.0,
                end_time=20.0,
                title="Insightful Moment (AI Fallback)",
                virality_score=75,
                explanation=(
                    "Automatically identified segment (AI analysis was unavailable)."
                ),
            )
        ]
