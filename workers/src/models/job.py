from enum import Enum
from pydantic import BaseModel

class JobState(str, Enum):
    PENDING = "PENDING"
    TRANSCRIBING = "TRANSCRIBING"
    ANALYZING = "ANALYZING"
    CLIPPING = "CLIPPING"
    CAPTIONING = "CAPTIONING"
    REFRAMING = "REFRAMING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class JobPayload(BaseModel):
    jobId: str
    projectId: str
    videoId: str
    filePath: str
    whisperModel: str | None = None
    manualSegments: list[dict] | None = None
    useYouTubeSubtitles: bool = True
    llmBackend: str | None = None
    llmModel: str | None = None
    onlyClipId: str | None = None

    class Config:
        populate_by_name = True
