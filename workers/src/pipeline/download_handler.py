import asyncio
import os
from pathlib import Path
from typing import Any, cast

import httpx
import yt_dlp

from src.config import config
from src.logger import logger
from src.models.download_job import DownloadJobPayload
from src.utils.api import get_auth_headers


async def update_download_status(
    download_id: str,
    status: str,
    progress: int = 0,
    file_path: str | None = None,
    file_name: str | None = None,
    file_size: int | None = None,
    failed_reason: str | None = None,
):
    url = f"{config.SERVER_URL}/download/{download_id}"
    payload = {
        "status": status,
        "progressPercent": progress,
    }
    if file_path:
        payload["filePath"] = file_path
    if file_name:
        payload["fileName"] = file_name
    if file_size:
        payload["fileSize"] = file_size
    if failed_reason:
        payload["failedReason"] = failed_reason

    try:
        async with httpx.AsyncClient(headers=get_auth_headers()) as client:
            response = await client.patch(url, json=payload)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to update remote download status: {e}")


async def process_youtube_download(payload: DownloadJobPayload):
    logger.info(f"Starting YouTube download job {payload.downloadId}")
    await update_download_status(payload.downloadId, "DOWNLOADING", 0)

    output_dir = Path("..") / "storage" / "downloads"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Needs to be absolute path to run from workers/
    output_template = str(output_dir.resolve() / f"{payload.downloadId}.%(ext)s")

    last_reported_progress = 0
    loop = asyncio.get_running_loop()

    def progress_hook(d):
        nonlocal last_reported_progress
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            if total and total > 0:
                percent = int((downloaded / total) * 100)
                # Debounce: report every 5%
                if percent >= last_reported_progress + 5:
                    last_reported_progress = percent
                    # Run coroutine threadsafe as callback runs in separate thread
                    # which is not the main event loop.
                    asyncio.run_coroutine_threadsafe(
                        update_download_status(
                            payload.downloadId, "DOWNLOADING", percent
                        ),
                        loop,
                    )

    ydl_opts: dict[str, Any] = {
        "format": payload.formatString,
        "outtmpl": output_template,
        "progress_hooks": [progress_hook],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        # Run synchronous yt_dlp in thread to not block event loop
        def download_sync():
            from typing import Any as AnyType
            with yt_dlp.YoutubeDL(cast(AnyType, ydl_opts)) as ydl:
                info = ydl.extract_info(payload.youtubeUrl, download=True)
                return ydl.prepare_filename(info), info.get("title", "Downloaded Video")

        file_path, file_name = await asyncio.to_thread(download_sync)

        # Calculate relative path
        rel_path = str(Path(file_path).relative_to(Path("..").resolve()))
        file_size = os.path.getsize(file_path)

        await update_download_status(
            payload.downloadId,
            "COMPLETED",
            100,
            file_path=rel_path,
            file_name=file_name,
            file_size=file_size,
        )
        logger.info(f"Completed YouTube download job {payload.downloadId}")
    except Exception as e:
        logger.error(f"Failed YouTube download job {payload.downloadId}: {e}")
        await update_download_status(payload.downloadId, "FAILED", failed_reason=str(e))
        raise e
