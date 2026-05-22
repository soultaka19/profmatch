"""Routes Admin pour la gestion des programmes académiques."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.programme import Programme
from app.models.user import User
from app.schemas.affectation import ProgrammeCreate, ProgrammeOut

router = APIRouter()


@router.get("/", response_model=list[ProgrammeOut])
async def list_programmes(
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[ProgrammeOut]:
    result = await db.execute(select(Programme).order_by(Programme.code))
    return list(result.scalars().all())


@router.post("/", response_model=ProgrammeOut, status_code=status.HTTP_201_CREATED)
async def create_programme(
    payload: ProgrammeCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> ProgrammeOut:
    existing = await db.execute(
        select(Programme).where(Programme.code == payload.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Programme {payload.code} existe déjà",
        )
    prog = Programme(code=payload.code, nom=payload.nom, departement=payload.departement)
    db.add(prog)
    await db.commit()
    await db.refresh(prog)
    return prog


@router.get("/{programme_id}", response_model=ProgrammeOut)
async def get_programme(
    programme_id: int,
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> ProgrammeOut:
    result = await db.execute(select(Programme).where(Programme.id == programme_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    return prog
