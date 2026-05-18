from app.worker import celery_app


@celery_app.task(bind=True, name="profmatch.cv.process_cv")
def process_cv(self, task_id: str, file_path: str, professeur_id: int) -> dict:
    """Traitement asynchrone d'un CV — implémenté dans la feature pipeline-ia."""
    raise NotImplementedError("À implémenter dans la feature pipeline-ia")
