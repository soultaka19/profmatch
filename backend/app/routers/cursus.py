"""Routes Admin : liaison cours-étape-programme (cursus).

Préfixe : /api/programmes/{programme_id}/etapes/{etape_id}/cours
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.cours_etape_programme import CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.user import User
from app.schemas.programme import CursusCreate, CursusOut, CursusUpdate

router = APIRouter()


async def _validate_etape(
    programme_id: int, etape_id: int, db: AsyncSession
) -> EtapeProgramme:
    result = await db.execute(
        select(EtapeProgramme).where(
            EtapeProgramme.id == etape_id,
            EtapeProgramme.programme_id == programme_id,
        )
    )
    etape = result.scalar_one_or_none()
    if etape is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Étape introuvable pour ce programme",
        )
    return etape


async def _validate_cours(cours_id: int, db: AsyncSession) -> Cours:
    result = await db.execute(select(Cours).where(Cours.id == cours_id))
    cours = result.scalar_one_or_none()
    if cours is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cours introuvable"
        )
    return cours


@router.post(
    "/{programme_id}/etapes/{etape_id}/cours",
    response_model=CursusOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_cursus(
    programme_id: int,
    etape_id: int,
    payload: CursusCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CursusOut:
    await _validate_etape(programme_id, etape_id, db)
    await _validate_cours(payload.cours_id, db)

    lien = CoursEtapeProgramme(
        programme_id=programme_id,
        etape_id=etape_id,
        cours_id=payload.cours_id,
        categorie=payload.categorie,
    )
    db.add(lien)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce cours est déjà rattaché à cette étape pour ce programme",
        )
    await db.refresh(lien)
    return lien


@router.get(
    "/{programme_id}/etapes/{etape_id}/cours",
    response_model=list[CursusOut],
)
async def list_cursus(
    programme_id: int,
    etape_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[CursusOut]:
    await _validate_etape(programme_id, etape_id, db)
    result = await db.execute(
        select(CoursEtapeProgramme)
        .where(
            CoursEtapeProgramme.programme_id == programme_id,
            CoursEtapeProgramme.etape_id == etape_id,
        )
        .order_by(CoursEtapeProgramme.id)
    )
    return list(result.scalars().all())


async def _get_lien_or_404(
    programme_id: int, etape_id: int, lien_id: int, db: AsyncSession
) -> CoursEtapeProgramme:
    result = await db.execute(
        select(CoursEtapeProgramme).where(
            CoursEtapeProgramme.id == lien_id,
            CoursEtapeProgramme.programme_id == programme_id,
            CoursEtapeProgramme.etape_id == etape_id,
        )
    )
    lien = result.scalar_one_or_none()
    if lien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lien cursus introuvable"
        )
    return lien


@router.put(
    "/{programme_id}/etapes/{etape_id}/cours/{lien_id}",
    response_model=CursusOut,
)
async def update_cursus(
    programme_id: int,
    etape_id: int,
    lien_id: int,
    payload: CursusUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CursusOut:
    lien = await _get_lien_or_404(programme_id, etape_id, lien_id, db)
    lien.categorie = payload.categorie
    await db.commit()
    await db.refresh(lien)
    return lien


@router.delete(
    "/{programme_id}/etapes/{etape_id}/cours/{lien_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cursus(
    programme_id: int,
    etape_id: int,
    lien_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    lien = await _get_lien_or_404(programme_id, etape_id, lien_id, db)
    await db.delete(lien)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
