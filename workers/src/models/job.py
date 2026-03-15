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

    class Config:
        populate_by_name = True
