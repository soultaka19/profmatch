"""Routes Cours : CRUD complet pour l'admin, lecture pour rh aussi.

Préfixe : /api/cours
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crud_helpers import get_or_404
from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.user import User
from app.schemas.cours import CoursCreate, CoursOut, CoursUpdate
from app.schemas.programme import CoursReadOnlyOut
from app.services.embeddings import build_cours_text, compute_embedding

router = APIRouter()


async def _compute_cours_embedding(nom: str, description: str | None) -> list[float]:
    """Embedding W4 du cours, calculé hors event loop (encodage CPU bloquant)."""
    return await asyncio.to_thread(compute_embedding, build_cours_text(nom, description))


@router.get("", response_model=list[CoursReadOnlyOut])
async def list_cours(
    q: str | None = None,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[CoursReadOnlyOut]:
    stmt = select(Cours).order_by(Cours.code)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Cours.code.ilike(like), Cours.nom.ilike(like)))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=CoursOut, status_code=status.HTTP_201_CREATED)
async def create_cours(
    payload: CoursCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CoursOut:
    existing = await db.execute(select(Cours).where(Cours.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un cours avec le code {payload.code} existe déjà",
        )
    cours = Cours(
        code=payload.code,
        nom=payload.nom,
        description=payload.description,
        credits=payload.credits,
        heures=payload.heures,
        embedding=await _compute_cours_embedding(payload.nom, payload.description),
    )
    db.add(cours)
    await db.commit()
    await db.refresh(cours)
    return cours


@router.get("/{cours_id}", response_model=CoursOut)
async def get_cours(
    cours_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> CoursOut:
    return await get_or_404(Cours, cours_id, db, label="Cours")


@router.put("/{cours_id}", response_model=CoursOut)
async def update_cours(
    cours_id: int,
    payload: CoursUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CoursOut:
    cours = await get_or_404(Cours, cours_id, db, label="Cours")
    texte_modifie = payload.nom is not None or payload.description is not None
    if payload.nom is not None:
        cours.nom = payload.nom
    if payload.description is not None:
        cours.description = payload.description
    if payload.credits is not None:
        cours.credits = payload.credits
    if payload.heures is not None:
        cours.heures = payload.heures
    if texte_modifie:
        cours.embedding = await _compute_cours_embedding(cours.nom, cours.description)
    await db.commit()
    await db.refresh(cours)
    return cours


@router.delete("/{cours_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cours(
    cours_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    cours = await get_or_404(Cours, cours_id, db, label="Cours")
    await db.delete(cours)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
