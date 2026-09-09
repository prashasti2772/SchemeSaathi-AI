import boto3
from botocore.client import Config
from src.config.settings import settings

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )
    return _s3_client


def get_presigned_upload_url(file_key: str, content_type: str, expires_in: int = 300) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": file_key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


def get_presigned_download_url(file_key: str, expires_in: int = 300) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": file_key},
        ExpiresIn=expires_in,
    )
