import os
import re
from typing import Any


def parse_time(time_str: str) -> float:
    """Converts HH:MM:SS.mmm or HH:MM:SS,mmm to seconds."""
    time_str = time_str.replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)

def parse_transcript_file(file_path: str) -> dict[str, Any]:
    """
    Parses a VTT or SRT file and returns a Whisper-compatible dictionary.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Transcript file not found at {file_path}")

    with open(file_path, encoding="utf-8") as f:
        content = f.read()

    segments = []
    # Simple regex for VTT/SRT timestamps: 00:00:00.000 --> 00:00:00.000
    timestamp_pattern = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}[.,]\d{3})"
    )

    # Split by double newline to get blocks
    blocks = re.split(r"\n\s*\n", content.strip())

    full_text = []

    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue

        times = timestamp_pattern.search(lines[0])
        if not times and len(lines) > 1:
            times = timestamp_pattern.search(lines[1])
            text_lines = lines[2:]
        else:
            text_lines = lines[1:]

        if times:
            start = parse_time(times.group(1))
            end = parse_time(times.group(2))
            text = " ".join(text_lines).strip()

            # Clean up VTT tags like <c.color> or </b>
            text = re.sub(r"<[^>]+>", "", text)

            if text:
                segments.append({
                    "start": start,
                    "end": end,
                    "text": text
                })
                full_text.append(text)

    return {
        "text": " ".join(full_text),
        "segments": segments
    }
