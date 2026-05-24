"""Routes Admin : étapes d'un programme académique.

Préfixe : /api/programmes/{programme_id}/etapes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme
from app.models.user import User
from app.schemas.programme import EtapeCreate, EtapeOut

router = APIRouter()


async def _get_programme_or_404(programme_id: int, db: AsyncSession) -> Programme:
    result = await db.execute(select(Programme).where(Programme.id == programme_id))
    prog = result.scalar_one_or_none()
    if prog is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    return prog


@router.post(
    "/{programme_id}/etapes",
    response_model=EtapeOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_etape(
    programme_id: int,
    payload: EtapeCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> EtapeOut:
    await _get_programme_or_404(programme_id, db)
    etape = EtapeProgramme(programme_id=programme_id, ordre=payload.ordre, nom=payload.nom)
    db.add(etape)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Une étape avec l'ordre {payload.ordre} existe déjà pour ce programme",
        )
    await db.refresh(etape)
    return etape


@router.get("/{programme_id}/etapes", response_model=list[EtapeOut])
async def list_etapes(
    programme_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[EtapeOut]:
    await _get_programme_or_404(programme_id, db)
    result = await db.execute(
        select(EtapeProgramme)
        .where(EtapeProgramme.programme_id == programme_id)
        .order_by(EtapeProgramme.ordre)
    )
    return list(result.scalars().all())
