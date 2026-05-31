from datetime import datetime, timezone
import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.cv import CV, CVStatut
from app.services.extraction_service import (
    compute_professeur_embedding, extract_structured_data, persist_extraction,
    ExtractionError,
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


@celery_app.task(bind=True, max_retries=2, default_retry_delay=10, time_limit=300)
def extract_cv_data_llm(self, cv_id: int) -> None:
    """Extrait via LLM les données structurées d'un CV déjà texte-extracté.

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
            client = get_llm_client()
            data = extract_structured_data(cv.texte_brut, client)
            persist_extraction(db, cv.professeur_id, data)
            db.flush()  # rend compétences/expériences/résumé visibles pour l'embedding
            compute_professeur_embedding(db, cv.professeur_id)
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
            # Retries épuisés : terminal ERREUR avant de propager, sinon le
            # CV reste en EN_COURS pour toujours (spinner frontend perpétuel).
            cv.statut = CVStatut.ERREUR
            cv.message_erreur = f"Extraction IA impossible après plusieurs tentatives : {exc}"
            cv.traite_le = datetime.now(timezone.utc)
            db.commit()
            raise
