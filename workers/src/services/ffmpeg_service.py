import asyncio
import json

from src.logger import logger


class FFmpegService:
    async def get_video_info(self, input_path: str) -> dict:
        """
        Returns video metadata using ffprobe.
        """
        command = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            input_path
        ]

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {stderr.decode()}")

        return json.loads(stdout.decode())

    async def extract_segment(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        end_time: float,
    ):
        """
        Extracts a segment from a video file without re-encoding
        (stream copy) for speed.
        If re-encoding is needed for better precision, we can adjust.
        """
        duration = end_time - start_time

        # -ss before -i is faster as it seeks to the point
        # -t is duration
        # -c copy avoids re-encoding
        # -avoid_negative_ts make_zero is often needed with -ss and -c copy
        command = [
            "ffmpeg",
            "-y", # Overwrite output
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", input_path,
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            output_path
        ]

        logger.debug(f"Running FFmpeg: {' '.join(command)}")

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"FFmpeg failed with exit code {process.returncode}")
            logger.error(f"FFmpeg stderr: {stderr.decode()}")
            raise RuntimeError(f"FFmpeg extraction failed: {stderr.decode()}")

        logger.info(f"Successfully extracted segment to {output_path}")

    async def burn_subtitles(self, input_path: str, output_path: str, srt_path: str):
        """
        Burns SRT subtitles into the video file. Requires re-encoding.
        """
        # The subtitles filter in FFmpeg can be tricky with paths.
        # We need to escape the SRT path properly.
        # For Linux, we might need to wrap the path in single quotes.
        # If the path has a colon (like in Windows), it needs more escaping.

        # We use a simple high-quality preset for re-encoding.
        command = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-vf",
            (
                f"subtitles='{srt_path}':force_style='FontSize=24,"
                "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
                "BorderStyle=1,Outline=1,Shadow=0,Alignment=2'"
            ),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "copy",
            output_path
        ]

        logger.debug(f"Running FFmpeg: {' '.join(command)}")

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"FFmpeg failed with exit code {process.returncode}")
            logger.error(f"FFmpeg stderr: {stderr.decode()}")
            raise RuntimeError(f"FFmpeg burn_subtitles failed: {stderr.decode()}")

        logger.info(f"Successfully burned subtitles into {output_path}")

    async def reframe_to_916(self, input_path: str, output_path: str):
        """
        Reframes video to 9:16 portrait aspect ratio using a center crop.
        Requires re-encoding.
        """
        # Smart Crop: Center crop targeting 9/16 of height.
        # We also scale the output to a standard 1080x1920 or similar
        # for consistency if needed,
        # but for now we'll just do a clean crop.
        # Filter: crop=h*9/16:h:(in_w-out_w)/2:0

        command = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-vf",
            (
                "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920:"
                "force_original_aspect_ratio=decrease,"
                "pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
            ),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "copy",
            output_path
        ]

        logger.debug(f"Running FFmpeg: {' '.join(command)}")

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"FFmpeg failed with exit code {process.returncode}")
            logger.error(f"FFmpeg stderr: {stderr.decode()}")
            raise RuntimeError(f"FFmpeg reframe_to_916 failed: {stderr.decode()}")

        logger.info(f"Successfully reframed video to {output_path}")

ffmpeg_service = FFmpegService()
