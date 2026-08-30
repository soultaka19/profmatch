from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur


def _seed_cv_for(prof: Professeur, content: bytes, ext: str, uploads_dir: Path) -> tuple[CV, Path]:
    relative = f"{prof.user_id}/test{ext}"
    physical = uploads_dir / relative
    physical.parent.mkdir(parents=True, exist_ok=True)
    physical.write_bytes(content)
    mime = (
        "application/pdf"
        if ext == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    cv = CV(
        professeur_id=prof.id,
        nom_original=f"test{ext}",
        chemin_fichier=relative,
        taille_octets=len(content),
        mime_type=mime,
        statut=CVStatut.EN_ATTENTE,
    )
    return cv, physical


@pytest.mark.asyncio
async def test_extract_pdf_extracts_text_and_chains_to_llm(
    db_session: AsyncSession,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    celery_eager,
):
    cv, _ = _seed_cv_for(professeur_prof, cv_sample_pdf_bytes, ".pdf", tmp_uploads_dir)
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    # Mock le maillon LLM en aval pour éviter un vrai appel API.
    with patch("app.tasks.extraction_tasks.extract_cv_data_llm") as mock_llm_task:
        from app.services.cv_extraction_service import extract_cv_text

        extract_cv_text(cv.id)
        mock_llm_task.delay.assert_called_once_with(cv.id)

    await db_session.refresh(cv)
    # extract_cv_text laisse le statut EN_COURS — la chaîne LLM le passera à TRAITE.
    assert cv.statut == CVStatut.EN_COURS
    assert cv.texte_brut is not None
    assert "Jean Dupont" in cv.texte_brut


@pytest.mark.asyncio
async def test_extract_docx_extracts_text_and_chains_to_llm(
    db_session: AsyncSession,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_sample_docx_bytes: bytes,
    celery_eager,
):
    cv, _ = _seed_cv_for(professeur_prof, cv_sample_docx_bytes, ".docx", tmp_uploads_dir)
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    with patch("app.tasks.extraction_tasks.extract_cv_data_llm") as mock_llm_task:
        from app.services.cv_extraction_service import extract_cv_text

        extract_cv_text(cv.id)
        mock_llm_task.delay.assert_called_once_with(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.EN_COURS
    assert cv.texte_brut is not None
    assert "Marie Tremblay" in cv.texte_brut


@pytest.mark.asyncio
async def test_extract_corrupt_pdf_sets_erreur(
    db_session: AsyncSession,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_corrupt_pdf_bytes: bytes,
    celery_eager,
):
    cv, _ = _seed_cv_for(professeur_prof, cv_corrupt_pdf_bytes, ".pdf", tmp_uploads_dir)
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    from app.services.cv_extraction_service import extract_cv_text

    extract_cv_text(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.ERREUR
    assert cv.message_erreur and "PDF" in cv.message_erreur


@pytest.mark.asyncio
async def test_extract_image_only_pdf_sets_erreur(
    db_session: AsyncSession,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_image_only_pdf_bytes: bytes,
    celery_eager,
):
    cv, _ = _seed_cv_for(professeur_prof, cv_image_only_pdf_bytes, ".pdf", tmp_uploads_dir)
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    from app.services.cv_extraction_service import extract_cv_text

    extract_cv_text(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.ERREUR
    assert "Aucun texte" in cv.message_erreur
