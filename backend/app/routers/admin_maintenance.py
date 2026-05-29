"""Endpoints de maintenance réservés à l'admin.

Préfixe monté dans `main.py` : `/api/admin/maintenance`.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.services.backfill_service import (
    backfill_embeddings_cours,
    backfill_embeddings_professeurs,
)

router = APIRouter()


class BackfillEmbeddingsOut(BaseModel):
    """Compteurs de la dernière exécution du backfill embeddings."""

    professeurs: int
    cours: int


@router.post("/backfill-embeddings", response_model=BackfillEmbeddingsOut)
async def backfill_embeddings(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> BackfillEmbeddingsOut:
    """Recalcule l'embedding W4 pour tout prof CV traité + tout cours qui en
    manque (utile après migration ou bootstrap de données legacy)."""
    n_profs = await backfill_embeddings_professeurs(db)
    n_cours = await backfill_embeddings_cours(db)
    return BackfillEmbeddingsOut(professeurs=n_profs, cours=n_cours)
