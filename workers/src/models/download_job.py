from pydantic import BaseModel

class DownloadJobPayload(BaseModel):
    downloadId: str
    youtubeUrl: str
    quality: str
    formatString: str
