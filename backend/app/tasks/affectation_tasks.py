"""Tâches Celery pour la génération asynchrone des affectations.

Conforme Cahier des charges §2.7 pattern Celery + Redis + polling :
- POST /api/affectations/generer → retourne task_id immédiatement
- GET /api/affectations/generation/{task_id} → statut: queued|processing|done|error
"""

import os
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.worker import celery_app


def _async_session_factory():
    raw_url = settings.DATABASE_URL
    if os.environ.get("PYTEST_CURRENT_TEST") and settings.TEST_DATABASE_URL:
        raw_url = settings.TEST_DATABASE_URL
    engine = create_async_engine(raw_url, echo=False)
    return async_sessionmaker(engine, expire_on_commit=False)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=15, time_limit=300)
def generer_affectations_task(
    self,
    session_id: int,
    programme_ids: list[int],
) -> dict:
    """Génère les affectations en arrière-plan et retourne le résumé.

    Retourne un dict `{session_id, nb_affectations, cours_sans_candidat: []}`.
    """
    import asyncio

    async def _run():
        from app.services.affectation_service import generer_affectations

        SessionLocal = _async_session_factory()
        async with SessionLocal() as db:
            affectations = await generer_affectations(session_id, programme_ids, db)
            return {
                "session_id": session_id,
                "nb_affectations": len(affectations),
            }

    try:
        return asyncio.run(_run())
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        raise
