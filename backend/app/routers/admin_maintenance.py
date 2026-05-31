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
from app.services.seed_demo_service import seed_jeu_demo

router = APIRouter()


class BackfillEmbeddingsOut(BaseModel):
    """Compteurs de la dernière exécution du backfill embeddings."""

    professeurs: int
    cours: int


class SeedDemoOut(BaseModel):
    """Totaux de la base après chargement du jeu de démonstration."""

    utilisateurs: int
    professeurs: int
    cours: int
    sessions: int
    embeddings_professeurs: int
    embeddings_cours: int


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


@router.post("/seed-demo", response_model=SeedDemoOut)
async def seed_demo(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> SeedDemoOut:
    """Charge (idempotent) le jeu de données de démonstration : comptes
    prof/rh/admin, programmes + cours + session, ~11 professeurs avec CV traité,
    puis recalcule les embeddings W4. Rejouable sans créer de doublon."""
    rapport = await seed_jeu_demo(db)
    return SeedDemoOut(**rapport.to_dict())
