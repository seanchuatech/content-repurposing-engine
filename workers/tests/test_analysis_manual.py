import asyncio
import json
import os
import sys
from unittest.mock import AsyncMock, patch

# Add workers/src to path
sys.path.append(os.path.join(os.getcwd(), "workers"))

from src.pipeline.analyze import analyze_transcript


async def test_manual_analysis():
    job_id = "test-job-manual"

    # 1. Load a real transcript if it exists, otherwise use a dummy
    transcript_path = "storage/temp/job-7/transcript.json"
    if os.path.exists(transcript_path):
        with open(transcript_path) as f:
            transcript = json.load(f)
    else:
        transcript = {"text": "This is a dummy transcript for testing purposes."}

    print(f"Testing analysis for job {job_id}...")

    # 2. Mock the LLM service to avoid needing a live API/Ollama
    mock_response = {
        "clips": [
            {
                "start_time": 0.0,
                "end_time": 5.0,
                "title": "Viral Moment 1",
                "virality_score": 95,
                "explanation": "Great hook."
            },
            {
                "start_time": 10.0,
                "end_time": 15.0,
                "title": "Viral Moment 2",
                "virality_score": 88,
                "explanation": "Deep insight."
            }
        ]
    }

    with patch("src.pipeline.analyze.llm_service.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_response

        # 3. Run analysis
        clips = await analyze_transcript(job_id, transcript)

        # 4. Verify results
        print(f"Found {len(clips)} clips.")
        for clip in clips:
            print(f" - {clip.title} ({clip.virality_score}%): {clip.start_time}s - {clip.end_time}s")

        analysis_path = f"storage/temp/{job_id}/analysis.json"
        if os.path.exists(analysis_path):
            print(f"SUCCESS: Analysis saved to {analysis_path}")
            with open(analysis_path) as f:
                saved_data = json.load(f)
                print(f"Saved data check: {len(saved_data.get('clips', []))} clips found in file.")
        else:
            print(f"FAILURE: Analysis NOT saved to {analysis_path}")

if __name__ == "__main__":
    asyncio.run(test_manual_analysis())
