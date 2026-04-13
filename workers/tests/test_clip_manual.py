import asyncio
import os
import sys

# Add workers/src to path
sys.path.append(os.path.join(os.getcwd(), "workers"))

from src.models.clip import Clip
from src.pipeline.clip import extract_clip


async def test_manual_clipping():
    # Path relative to the script execution point (if run from project root)
    # But extract_clip uses config.PROJECT_ROOT which is absolute.
    # So we should pass a path relative to PROJECT_ROOT to extract_clip.
    video_path_rel = "storage/uploads/talking_test.mp4"

    # Check if file exists relative to project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    full_video_path = os.path.join(project_root, video_path_rel)

    if not os.path.exists(full_video_path):
        print(f"Error: video file not found at {full_video_path}")
        return

    job_id = "test-job-clipping"
    clip = Clip(
        id=f"{job_id}-clip-1",
        job_id=job_id,
        start_time=2.0,
        end_time=7.0,
        title="Testing Clip Extraction",
        virality_score=90,
        explanation="Testing the FFmpeg service.",
    )

    print(f"Testing clip extraction for job {job_id}...")

    try:
        clip_path_rel = await extract_clip(video_path_rel, clip)
        print(f"Clip extracted to: {clip_path_rel}")

        full_path = os.path.join(os.getcwd(), clip_path_rel)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            print(f"SUCCESS: File exists at {full_path} (Size: {size} bytes)")
        else:
            print(f"FAILURE: File NOT found at {full_path}")
    except Exception as e:
        print(f"FAILURE: Exception occurred: {e}")


if __name__ == "__main__":
    asyncio.run(test_manual_clipping())
