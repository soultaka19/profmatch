from pathlib import Path

import pytest
from httpx import AsyncClient

from app.models.cv import CVStatut


@pytest.mark.asyncio
async def test_upload_requires_auth(client: AsyncClient, cv_sample_pdf_bytes: bytes):
    files = {"file": ("cv.pdf", cv_sample_pdf_bytes, "application/pdf")}
    resp = await client.post("/api/cv/upload", files=files)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_requires_prof_role(
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
    cv_sample_pdf_bytes: bytes,
):
    files = {"file": ("cv.pdf", cv_sample_pdf_bytes, "application/pdf")}
    resp = await client.post("/api/cv/upload", files=files, headers=auth_headers_rh)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_success_returns_cv_response(
    client: AsyncClient,
    auth_headers_prof: dict[str, str],
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    celery_eager,
):
    files = {"file": ("cv.pdf", cv_sample_pdf_bytes, "application/pdf")}
    resp = await client.post("/api/cv/upload", files=files, headers=auth_headers_prof)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nom_original"] == "cv.pdf"
    assert body["statut"] in (CVStatut.EN_ATTENTE.value, CVStatut.TRAITE.value)
    assert body["taille_octets"] == len(cv_sample_pdf_bytes)


@pytest.mark.asyncio
async def test_get_me_returns_cv_after_upload(
    client: AsyncClient,
    auth_headers_prof: dict[str, str],
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    celery_eager,
):
    files = {"file": ("cv.pdf", cv_sample_pdf_bytes, "application/pdf")}
    await client.post("/api/cv/upload", files=files, headers=auth_headers_prof)

    resp = await client.get("/api/cv/me", headers=auth_headers_prof)
    assert resp.status_code == 200
    body = resp.json()
    assert body["nom_original"] == "cv.pdf"


@pytest.mark.asyncio
async def test_get_me_404_when_no_cv(
    client: AsyncClient,
    auth_headers_prof: dict[str, str],
    tmp_uploads_dir: Path,
):
    resp = await client.get("/api/cv/me", headers=auth_headers_prof)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_texte_returns_text_when_processed(
    client: AsyncClient,
    auth_headers_prof: dict[str, str],
    tmp_uploads_dir: Path,
    cv_sample_pdf_bytes: bytes,
    celery_eager,
):
    files = {"file": ("cv.pdf", cv_sample_pdf_bytes, "application/pdf")}
    await client.post("/api/cv/upload", files=files, headers=auth_headers_prof)

    resp = await client.get("/api/cv/me/texte", headers=auth_headers_prof)
    assert resp.status_code == 200
    assert "Jean Dupont" in resp.json()["texte_brut"]
