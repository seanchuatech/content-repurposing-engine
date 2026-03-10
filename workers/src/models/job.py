from pydantic import BaseModel


class JobPayload(BaseModel):
    jobId: str
    projectId: str
    videoId: str
    filePath: str

    class Config:
        populate_by_name = True
