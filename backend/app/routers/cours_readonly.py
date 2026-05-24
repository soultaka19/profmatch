"""Endpoint de lecture des cours, utilisé par l'UI admin pour rattacher
les cours à un cursus. Le CRUD complet des cours sera dans PR-C.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.user import User
from app.schemas.programme import CoursReadOnlyOut

router = APIRouter()


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
