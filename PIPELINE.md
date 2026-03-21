💣 1. The Groq 25MB Time Bomb (whisper_service.py) Your audio extraction logic
logs a warning if the file exceeds 25MB (if file_size_mb > 25:
logger.warning(...)), but it proceeds to make the API call anyway. Groq will
instantly reject this.

The Math: 16kHz mono FLAC consumes about 1MB per minute of audio. If you process
a gaming lore video longer than 25 minutes, the pipeline crashes.

The Fix: You must implement chunking. Use pydub or FFmpeg to slice the audio
file into 20-minute (20MB) segments, send them to Groq sequentially (or
concurrently), and stitch the JSON responses back together before passing them
to the pipeline.

✂️ 2. The 15-Minute Blindspot (analyze.py) You are blindly truncating the
transcript at 12,000 characters (transcript_text = transcript_text[:12000] +
"...").

The Problem: 12,000 characters is only roughly 12 to 15 minutes of spoken
dialogue. If you feed an hour-long podcast into this engine, the LLM will
literally never see the final 45 minutes of the video. You are throwing away the
majority of your potential viral clips.

The Fix: If you are using Gemini 3 Flash, drop the truncation entirely. Gemini
has a 1-million token context window; it can read a 4-hour transcript instantly.
If you are using an OpenAI model with a smaller window, implement a
sliding-window chunking logic that analyzes 15-minute blocks at a time.

🔥 3. The Double-Encode Death Trap (ffmpeg_service.py) Your pipeline logic
separates burn_subtitles and reframe_to_916 into distinct functions, both of
which use libx264 to re-encode the video.

The Problem: Running these sequentially on a 15-second clip means your Dell
laptop is decoding and re-encoding the video twice. This destroys video quality
(generation loss) and doubles your processing time.

The Fix: Combine them into a single FFmpeg command using a complex filtergraph
(-vf). You want to crop, scale, and burn subtitles in one single pass: "-vf",
f"crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920,subtitles='{srt_path}':force_style='...'",

🎯 4. Precision Clipping Failure (ffmpeg_service.py) In extract_segment, you are
using -c copy to avoid re-encoding.

The Problem: -c copy forces FFmpeg to cut at the nearest keyframe, not the exact
millisecond timestamp. For short-form content, missing the start of a hook by
1.5 seconds ruins the entire video.

The Fix: Since you are going to re-encode the clip later anyway to burn
subtitles and crop it, do not use -c copy for the extraction step.
Alternatively, do the extraction, cropping, and subtitling all in one master
FFmpeg command.

🛡️ 5. Brittle JSON Parsing (llm_service.py) In _generate_gemini, you directly
parse the response text with json.loads(response.text).

The Problem: Even when told to return JSON, LLMs frequently wrap the output in
markdown block ticks (json \n { ... } \n ). This will throw a
json.decoder.JSONDecodeError and crash the worker.

The Fix: Write a regex stripper or a `.replace("
