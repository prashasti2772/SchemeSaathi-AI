from redis.asyncio import Redis, from_url
from src.config.settings import settings

_redis_client: Redis | None = None


def get_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def get_redis():
    client = get_redis_client()
    yield client
