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
    etape_ids: list[int] | None = None,
) -> dict:
    """Génère les affectations en arrière-plan et retourne le résumé.

    Retourne un dict `{session_id, nb_affectations, programmes_exclus: []}`.
    """
    import asyncio

    async def _run():
        from app.services.affectation_service import generer_affectations

        SessionLocal = _async_session_factory()
        async with SessionLocal() as db:
            affectations, programmes_exclus = await generer_affectations(
                session_id, programme_ids, db, etape_ids
            )
            return {
                "session_id": session_id,
                "nb_affectations": len(affectations),
                "programmes_exclus": programmes_exclus,
            }

    try:
        return asyncio.run(_run())
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        raise


@celery_app.task(bind=True, max_retries=0, time_limit=60)
def enrichir_justification_xai_task(self, affectation_id: int, ctx_dict: dict) -> dict:
    """Enrichit une affectation avec la narration XAI LLM.

    Pattern : 1 tentative LLM unique, idempotente, sans retry interne (le LLM
    compétition est intermittent — préférer un échec rapide marqué ECHEC plutôt
    qu'un blocage). En cas de timeout/erreur, la justification statique posée
    par la génération reste intacte et le statut bascule en ECHEC pour visibilité.

    `ctx_dict` est la sérialisation JSON du `ContexteJustification` qu'on avait
    en main au moment de la génération — évite de devoir recharger 10 entités
    pour reconstruire le contexte côté worker.
    """
    import asyncio

    async def _run():
        from app.services.affectation_enrichissement import enrichir_justification_xai

        SessionLocal = _async_session_factory()
        async with SessionLocal() as db:
            return await enrichir_justification_xai(affectation_id, ctx_dict, db)

    return asyncio.run(_run())
