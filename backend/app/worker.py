from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "profmatch",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.services.cv_extraction_service",
        "app.tasks.extraction_tasks",
        "app.tasks.affectation_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Toronto",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=settings.CELERY_ALWAYS_EAGER,
    task_eager_propagates=True,
)
