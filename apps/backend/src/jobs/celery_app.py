from celery import Celery
from src.config.settings import settings

celery_app = Celery("scheme_matching", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=120,
    worker_max_tasks_per_child=200,
)
celery_app.autodiscover_tasks(["src.jobs"])
