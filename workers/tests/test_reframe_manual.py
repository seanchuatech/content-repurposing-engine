import asyncio
import os
import sys

# Add workers/src to path
sys.path.append(os.path.join(os.getcwd(), "workers"))

from src.models.clip import Clip
from src.pipeline.reframe import reframe_clip


async def test_manual_reframing():
    job_id = "test-job-clipping"
    clip_id = f"{job_id}-clip-1"

    # PROJECT ROOT
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    captioned_path_rel = f"storage/clips/{clip_id}_captioned.mp4"
    full_input_path = os.path.join(project_root, captioned_path_rel)

    if not os.path.exists(full_input_path):
        print(f"Error: captioned file not found at {full_input_path}. Run test_caption_manual.py first.")
        return

    clip = Clip(
        id=clip_id,
        job_id=job_id,
        start_time=2.0,
        end_time=7.0,
        title="Testing Reframing",
        virality_score=90,
        explanation="Testing the FFmpeg reframe service."
    )

    print(f"Testing reframing for clip {clip_id}...")

    try:
        final_path_rel = await reframe_clip(captioned_path_rel, clip)
        print(f"Final clip saved to: {final_path_rel}")

        full_path = os.path.join(project_root, final_path_rel)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            print(f"SUCCESS: File exists at {full_path} (Size: {size} bytes)")
        else:
            print(f"FAILURE: File NOT found at {full_path}")
    except Exception as e:
        print(f"FAILURE: Exception occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_manual_reframing())
