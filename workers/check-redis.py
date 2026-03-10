import asyncio
from redis.asyncio import Redis
from src.config import config

async def check_job():
    r = Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    job_key = "bull:video-processing:job-5"
    job_data = await r.hgetall(job_key)
    if not job_data:
        print(f"Job {job_key} not found in Redis.")
        return
    
    print(f"Job Data for {job_key}:")
    for k, v in job_data.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(check_job())
