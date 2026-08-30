from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.cv import CV, CVSource, CVStatut
from app.models.professeur import Professeur
from app.models.user import User
from app.services.cv_extraction_service import extract_cv_text

ALLOWED_MIME = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


async def upload(file: UploadFile, current_user: User, db: AsyncSession) -> CV:
    # 1. Read file bytes
    content = await file.read()
    size = len(content)

    # Taille max configurable (MAX_UPLOAD_SIZE_MB, défaut 10 Mo)
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE_MB} Mo)",
        )

    mime = file.content_type or ""
    if mime not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format non supporté. PDF ou DOCX uniquement.",
        )

    expected_ext = ALLOWED_MIME[mime]
    filename = (file.filename or "").lower()
    if not filename.endswith(expected_ext):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Extension de fichier incohérente avec le type ({expected_ext} attendu).",
        )

    # 2. Locate professeur row (guaranteed by the after_insert listener).
    result = await db.execute(select(Professeur).where(Professeur.user_id == current_user.id))
    professeur = result.scalar_one()

    # 3. Locate existing CV row, if any.
    result = await db.execute(select(CV).where(CV.professeur_id == professeur.id))
    existing = result.scalar_one_or_none()

    # 4. Persist file to disk.
    user_dir: Path = settings.UPLOADS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    new_relative = f"{current_user.id}/{uuid4().hex}{expected_ext}"
    physical_path = settings.UPLOADS_DIR / new_relative
    physical_path.write_bytes(content)

    # 5. UPSERT row.
    if existing:
        if existing.source != CVSource.MANUAL:
            old_path = settings.UPLOADS_DIR / existing.chemin_fichier
            if old_path.exists():
                old_path.unlink()

        existing.nom_original = file.filename
        existing.chemin_fichier = new_relative
        existing.taille_octets = size
        existing.mime_type = mime
        existing.statut = CVStatut.EN_ATTENTE
        existing.source = CVSource.UPLOAD
        existing.texte_brut = None
        existing.message_erreur = None
        existing.traite_le = None
        cv = existing
    else:
        cv = CV(
            professeur_id=professeur.id,
            nom_original=file.filename,
            chemin_fichier=new_relative,
            taille_octets=size,
            mime_type=mime,
            statut=CVStatut.EN_ATTENTE,
            source=CVSource.UPLOAD,
        )
        db.add(cv)

    await db.commit()
    await db.refresh(cv)

    # 6. Enqueue extraction.
    extract_cv_text.delay(cv.id)

    return cv


async def get_my_cv(current_user: User, db: AsyncSession) -> CV | None:
    result = await db.execute(
        select(CV).join(Professeur).where(Professeur.user_id == current_user.id)
    )
    return result.scalar_one_or_none()


async def create_manual(current_user: User, db: AsyncSession) -> CV:
    result = await db.execute(select(Professeur).where(Professeur.user_id == current_user.id))
    professeur = result.scalar_one()

    result = await db.execute(select(CV).where(CV.professeur_id == professeur.id))
    existing = result.scalar_one_or_none()

    _ACTIVE = {CVStatut.TRAITE, CVStatut.EN_ATTENTE, CVStatut.EN_COURS}
    if existing is not None and existing.statut in _ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un CV actif existe déjà.",
        )

    if existing is not None:
        existing.nom_original = "CV Manuel"
        existing.chemin_fichier = "manual"
        existing.taille_octets = 0
        existing.mime_type = "manual"
        existing.statut = CVStatut.TRAITE
        existing.source = CVSource.MANUAL
        existing.texte_brut = None
        existing.message_erreur = None
        existing.traite_le = None
        cv = existing
    else:
        cv = CV(
            professeur_id=professeur.id,
            nom_original="CV Manuel",
            chemin_fichier="manual",
            taille_octets=0,
            mime_type="manual",
            statut=CVStatut.TRAITE,
            source=CVSource.MANUAL,
        )
        db.add(cv)

    await db.commit()
    await db.refresh(cv)
    return cv
