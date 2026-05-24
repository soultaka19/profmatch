"""Routes Admin : compétences requises par un cours.

Préfixe : /api/cours/{cours_id}/competences
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.user import User
from app.schemas.cours import (
    CoursCompetenceCreate,
    CoursCompetenceOut,
    CoursCompetenceUpdate,
)

router = APIRouter()


async def _validate_cours(cours_id: int, db: AsyncSession) -> Cours:
    result = await db.execute(select(Cours).where(Cours.id == cours_id))
    cours = result.scalar_one_or_none()
    if cours is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cours introuvable"
        )
    return cours


async def _get_competence_or_404(
    cours_id: int, competence_id: int, db: AsyncSession
) -> CoursCompetence:
    result = await db.execute(
        select(CoursCompetence).where(
            CoursCompetence.id == competence_id,
            CoursCompetence.cours_id == cours_id,
        )
    )
    comp = result.scalar_one_or_none()
    if comp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Compétence introuvable"
        )
    return comp


@router.post(
    "/{cours_id}/competences",
    response_model=CoursCompetenceOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_competence(
    cours_id: int,
    payload: CoursCompetenceCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CoursCompetenceOut:
    await _validate_cours(cours_id, db)
    comp = CoursCompetence(
        cours_id=cours_id,
        nom=payload.nom,
        importance=payload.importance,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.get(
    "/{cours_id}/competences",
    response_model=list[CoursCompetenceOut],
)
async def list_competences(
    cours_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[CoursCompetenceOut]:
    await _validate_cours(cours_id, db)
    result = await db.execute(
        select(CoursCompetence)
        .where(CoursCompetence.cours_id == cours_id)
        .order_by(CoursCompetence.importance.desc(), CoursCompetence.nom)
    )
    return list(result.scalars().all())


@router.put(
    "/{cours_id}/competences/{competence_id}",
    response_model=CoursCompetenceOut,
)
async def update_competence(
    cours_id: int,
    competence_id: int,
    payload: CoursCompetenceUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CoursCompetenceOut:
    comp = await _get_competence_or_404(cours_id, competence_id, db)
    comp.importance = payload.importance
    await db.commit()
    await db.refresh(comp)
    return comp


@router.delete(
    "/{cours_id}/competences/{competence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_competence(
    cours_id: int,
    competence_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    comp = await _get_competence_or_404(cours_id, competence_id, db)
    await db.delete(comp)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
