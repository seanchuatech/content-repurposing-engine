import asyncio
import json
import os
import sys

# Add workers/src to path
sys.path.append(os.path.join(os.getcwd(), "workers"))

from src.models.clip import Clip
from src.pipeline.caption import generate_captions


async def test_manual_captioning():
    job_id = "test-job-clipping"  # Use same job_id as previous test
    clip_id = f"{job_id}-clip-1"

    # PROJECT ROOT
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    clip_path_rel = f"storage/clips/{clip_id}_raw.mp4"
    transcript_path = os.path.join(
        project_root, "storage", "temp", "job-7", "transcript.json"
    )
    full_clip_path = os.path.join(project_root, clip_path_rel)

    if not os.path.exists(transcript_path):
        print(f"Error: transcript file not found at {transcript_path}")
        return

    if not os.path.exists(full_clip_path):
        print(
            f"Error: clip file not found at {full_clip_path}. "
            f"Run test_clip_manual.py first."
        )
        return

    with open(transcript_path) as f:
        transcript = json.load(f)

    # Note: job-7 transcript (JFK) might not match talking_test.mp4 timing,
    # but for testing the mechanics of burning captions, it's fine.
    clip = Clip(
        id=clip_id,
        job_id=job_id,
        start_time=2.0,
        end_time=7.0,
        title="Testing Captioning",
        virality_score=90,
        explanation="Testing the FFmpeg caption service.",
    )

    print(f"Testing caption generation for clip {clip_id}...")

    try:
        captioned_path_rel = await generate_captions(clip_path_rel, clip, transcript)
        print(f"Captioned clip saved to: {captioned_path_rel}")

        full_path = os.path.join(project_root, captioned_path_rel)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            print(f"SUCCESS: File exists at {full_path} (Size: {size} bytes)")
        else:
            print(f"FAILURE: File NOT found at {full_path}")
    except Exception as e:
        print(f"FAILURE: Exception occurred: {e}")


if __name__ == "__main__":
    asyncio.run(test_manual_captioning())
