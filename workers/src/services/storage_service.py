import os

import boto3

from src.config import config
from src.logger import logger


class StorageService:
    def __init__(self):
        self.backend = config.STORAGE_BACKEND
        if self.backend == "s3":
            self.s3 = boto3.client(
                "s3", region_name=os.getenv("AWS_REGION", "ap-southeast-1")
            )
            self.bucket = os.getenv("S3_MEDIA_BUCKET", "content-engine-media")

    def download_if_s3(self, relative_path: str) -> str:
        if self.backend == "local":
            return os.path.join(config.PROJECT_ROOT, relative_path)

        # For S3, download to a local temp path
        local_path = os.path.join(config.PROJECT_ROOT, relative_path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        if not os.path.exists(local_path):
            logger.info(f"Downloading {relative_path} from S3...")
            self.s3.download_file(self.bucket, relative_path, local_path)
        return local_path

    def upload_if_s3(self, local_path: str, relative_path: str):
        if self.backend == "s3":
            logger.info(f"Uploading {relative_path} to S3...")
            self.s3.upload_file(local_path, self.bucket, relative_path)

storage_service = StorageService()
