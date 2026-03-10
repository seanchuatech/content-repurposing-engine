from redis.asyncio import Redis

from src.config import config


async def get_redis_connection() -> Redis:
    # BullMQ Python uses redis.asyncio pool
    return Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
