from pydantic import BaseModel


class Clip(BaseModel):
    id: str
    job_id: str
    start_time: float
    end_time: float
    title: str
    virality_score: int
    explanation: str
    storage_path: str | None = None
