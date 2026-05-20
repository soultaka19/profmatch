from io import BytesIO
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.user import User
from app.services import cv_service


def _make_upload(filename: str, content: bytes, content_type: str) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers={"content-type": content_type},
    )


class _DummyTask:
    """Stand-in for the Celery task during unit tests of cv_service."""
    @staticmethod
    def delay(cv_id: int) -> None:
        return None


@pytest.mark.asyncio
async def test_upload_creates_cv_row_and_file(
    db_session: AsyncSession,
    test_user_prof: User,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    monkeypatch,
):
    # Replace the Celery task with a no-op so statut stays at EN_ATTENTE.
    monkeypatch.setattr("app.services.cv_service.extract_cv_text", _DummyTask)

    upload = _make_upload("cv.pdf", cv_sample_pdf_bytes, "application/pdf")
    cv = await cv_service.upload(upload, test_user_prof, db_session)

    assert cv.statut == CVStatut.EN_ATTENTE
    assert cv.nom_original == "cv.pdf"
    assert cv.taille_octets == len(cv_sample_pdf_bytes)
    physical = tmp_uploads_dir / cv.chemin_fichier
    assert physical.exists()
    assert physical.read_bytes() == cv_sample_pdf_bytes


@pytest.mark.asyncio
async def test_upload_replaces_existing_cv(
    db_session: AsyncSession,
    test_user_prof: User,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    cv_sample_docx_bytes: bytes,
    monkeypatch,
):
    monkeypatch.setattr("app.services.cv_service.extract_cv_text", _DummyTask)

    first = await cv_service.upload(
        _make_upload("first.pdf", cv_sample_pdf_bytes, "application/pdf"),
        test_user_prof,
        db_session,
    )
    first_path = tmp_uploads_dir / first.chemin_fichier
    assert first_path.exists()

    second = await cv_service.upload(
        _make_upload(
            "second.docx",
            cv_sample_docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        test_user_prof,
        db_session,
    )

    assert second.id == first.id  # same row updated
    assert second.nom_original == "second.docx"
    assert not first_path.exists()  # old file deleted

    result = await db_session.execute(
        select(CV).where(CV.professeur_id == professeur_prof.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_upload_rejects_too_large(
    db_session: AsyncSession,
    test_user_prof: User,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
):
    huge = b"x" * (10 * 1024 * 1024 + 1)
    upload = _make_upload("huge.pdf", huge, "application/pdf")
    with pytest.raises(HTTPException) as exc:
        await cv_service.upload(upload, test_user_prof, db_session)
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_upload_rejects_wrong_mime(
    db_session: AsyncSession,
    test_user_prof: User,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
):
    upload = _make_upload("cv.png", b"fake png", "image/png")
    with pytest.raises(HTTPException) as exc:
        await cv_service.upload(upload, test_user_prof, db_session)
    assert exc.value.status_code == 415


@pytest.mark.asyncio
async def test_upload_rejects_wrong_extension(
    db_session: AsyncSession,
    test_user_prof: User,
    professeur_prof: Professeur,
    tmp_uploads_dir: Path,
):
    upload = _make_upload("cv.exe", b"MZ\x00", "application/pdf")
    with pytest.raises(HTTPException) as exc:
        await cv_service.upload(upload, test_user_prof, db_session)
    assert exc.value.status_code == 415
