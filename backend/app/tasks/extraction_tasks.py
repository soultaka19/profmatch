from datetime import datetime, timezone
import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.cv import CV, CVStatut
from app.services.extraction_service import (
    extract_structured_data, persist_extraction, ExtractionError,
)
from app.services.llm_client import get_llm_client
from app.worker import celery_app


def _sync_session_factory():
    raw_url = settings.DATABASE_URL
    if os.environ.get("PYTEST_CURRENT_TEST") and settings.TEST_DATABASE_URL:
        raw_url = settings.TEST_DATABASE_URL
    sync_url = raw_url.replace("+asyncpg", "")
    engine = create_engine(sync_url, echo=False)
    return sessionmaker(engine, expire_on_commit=False)


def _use_mock_mode() -> bool:
    """Retourne True si le mock doit être utilisé.

    Conditions :
    1. LLM_MOCK_MODE explicitement activé dans la config, OU
    2. Credentials LLM absents (LLM_API_COOKIE vide) — évite une erreur 401
       prévisible et permet de tester toute la chaîne en développement.
    """
    if settings.LLM_MOCK_MODE:
        return True
    if not settings.LLM_API_COOKIE:
        return True
    return False


@celery_app.task(bind=True, max_retries=2, default_retry_delay=10, time_limit=120)
def extract_cv_data_llm(self, cv_id: int) -> None:
    """Extrait via LLM les données structurées d'un CV déjà texte-extracté.

    - Si LLM_MOCK_MODE=true ou credentials absents : parsing heuristique local.
    - Si texte_brut absent : no-op.
    - Validation LLM 2× échouée -> statut=erreur, texte_brut préservé.
    - Erreur transient (API timeout, 5xx) -> Celery retry (max 2x, 10s delay).
    """
    SessionLocal = _sync_session_factory()
    with SessionLocal() as db:
        cv: CV | None = db.execute(select(CV).where(CV.id == cv_id)).scalar_one_or_none()
        if cv is None or not cv.texte_brut:
            return

        try:
            if _use_mock_mode():
                # ── Extraction locale sans LLM ───────────────────────────────
                from app.services.llm_mock import mock_extract
                data = mock_extract(cv.texte_brut)
            else:
                # ── Extraction LLM réelle ────────────────────────────────────
                client = get_llm_client()
                data = extract_structured_data(cv.texte_brut, client)

            persist_extraction(db, cv.professeur_id, data)
            cv.statut = CVStatut.TRAITE
            cv.traite_le = datetime.now(timezone.utc)
            cv.message_erreur = None
            db.commit()

        except ExtractionError as exc:
            cv.statut = CVStatut.ERREUR
            cv.message_erreur = f"Extraction IA échouée : {exc}"
            cv.traite_le = datetime.now(timezone.utc)
            db.commit()
        except Exception as exc:
            db.rollback()
            if self.request.retries < self.max_retries:
                raise self.retry(exc=exc)
            cv.statut = CVStatut.ERREUR
            cv.message_erreur = f"Extraction IA impossible après plusieurs tentatives : {exc}"
            cv.traite_le = datetime.now(timezone.utc)
            db.commit()
            raise
