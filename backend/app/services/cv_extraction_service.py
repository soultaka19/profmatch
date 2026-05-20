from datetime import datetime, timezone
from pathlib import Path

import pdfplumber
from celery import shared_task
from docx import Document
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.cv import CV, CVStatut
from app.worker import celery_app


def _sync_session_factory():
    """Build a synchronous session factory for the Celery worker.

    The rest of the app uses async sessions; the worker uses sync to avoid
    asyncio + Celery integration complexity. When tests are running (detected
    via PYTEST_CURRENT_TEST), use TEST_DATABASE_URL so the worker sees the
    same rows as the test's async session.
    """
    import os
    raw_url = settings.DATABASE_URL
    if os.environ.get("PYTEST_CURRENT_TEST") and settings.TEST_DATABASE_URL:
        raw_url = settings.TEST_DATABASE_URL
    sync_url = raw_url.replace("+asyncpg", "")
    engine = create_engine(sync_url, echo=False)
    return sessionmaker(engine, expire_on_commit=False)


def _extract_pdf(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n\n".join((page.extract_text() or "") for page in pdf.pages).strip()


def _extract_docx(path: Path) -> str:
    doc = Document(str(path))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()


@celery_app.task(bind=True, max_retries=2, default_retry_delay=5, time_limit=60)
def extract_cv_text(self, cv_id: int) -> None:
    SessionLocal = _sync_session_factory()
    with SessionLocal() as db:
        cv = db.execute(select(CV).where(CV.id == cv_id)).scalar_one_or_none()
        if cv is None:
            return

        cv.statut = CVStatut.EN_COURS
        db.commit()

        physical = settings.UPLOADS_DIR / cv.chemin_fichier
        try:
            if not physical.exists():
                raise FileNotFoundError("Fichier CV introuvable sur le disque.")

            if cv.mime_type == "application/pdf":
                try:
                    texte = _extract_pdf(physical)
                except Exception as exc:
                    raise ValueError(f"PDF illisible: {exc}") from exc
            else:
                try:
                    texte = _extract_docx(physical)
                except Exception as exc:
                    raise ValueError(f"DOCX illisible: {exc}") from exc

            if not texte:
                raise ValueError("Aucun texte détectable dans le CV (PDF image-only ?).")

            cv.texte_brut = texte
            # Statut RESTE en_cours — la chaîne LLM (extract_cv_data_llm) continue.
            # Le statut passera à TRAITE quand l'extraction structurée sera terminée.
            cv.message_erreur = None
            db.commit()

            # Chaînage Celery : déclenche l'extraction LLM en aval.
            # Lazy import pour éviter cycle (extraction_tasks importe la même metadata).
            from app.tasks.extraction_tasks import extract_cv_data_llm
            extract_cv_data_llm.delay(cv.id)
        except (FileNotFoundError, ValueError) as exc:
            cv.statut = CVStatut.ERREUR
            cv.message_erreur = str(exc)
            cv.traite_le = datetime.now(timezone.utc)
            db.commit()
        except Exception as exc:  # transient (DB, IO) — retry
            cv.statut = CVStatut.EN_ATTENTE  # remettre en file pour retry
            db.commit()
            raise self.retry(exc=exc)
