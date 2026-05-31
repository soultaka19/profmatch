"""Orchestration du jeu de données de démonstration (déclenché à la demande).

Exposé via `POST /api/admin/maintenance/seed-demo` (admin only). Réutilise les
scripts de seed idempotents existants — comptes, référentiel (programmes /
cours / session) et professeurs avec CV traité — puis recalcule les embeddings
W4 afin que la génération d'affectations dispose de candidats avec un score
sémantique exploitable.

L'historique W3 n'est volontairement PAS seedé ici : il s'alimente à la
validation d'affectations, or aucune affectation PROPOSEE n'existe sur un jeu
neuf (avant toute génération). Il se construit donc naturellement pendant la
démonstration, ou via `scripts/seed_historique_demo.py` après une génération.

Chaque script gère sa propre transaction et est idempotent (skip si l'entité
existe déjà), ce qui rend l'appel rejouable sans créer de doublon.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Session
from app.models.user import User
from app.services.backfill_service import (
    backfill_embeddings_cours,
    backfill_embeddings_professeurs,
)
from scripts.seed_affectation_demo import seed as _seed_referentiel
from scripts.seed_demo import seed as _seed_comptes
from scripts.seed_profs_demo import seed as _seed_profs


@dataclass(frozen=True)
class SeedDemoReport:
    """Compteurs de l'état de la base après seed (totaux, pas seulement créés)."""

    utilisateurs: int
    professeurs: int
    cours: int
    sessions: int
    embeddings_professeurs: int
    embeddings_cours: int

    def to_dict(self) -> dict[str, int]:
        return asdict(self)


async def _total(db: AsyncSession, model: type) -> int:
    return (await db.execute(select(func.count()).select_from(model))).scalar_one()


async def seed_jeu_demo(db: AsyncSession) -> SeedDemoReport:
    """Charge le jeu de démonstration complet et renvoie les totaux résultants.

    Ordre : comptes → référentiel (cours/session) → professeurs CV traité →
    backfill des embeddings W4. Les trois premières étapes committent leur
    propre transaction ; le backfill utilise la session de la requête.
    """
    await _seed_comptes()
    await _seed_referentiel()
    await _seed_profs()

    n_emb_professeurs = await backfill_embeddings_professeurs(db)
    n_emb_cours = await backfill_embeddings_cours(db)

    return SeedDemoReport(
        utilisateurs=await _total(db, User),
        professeurs=await _total(db, Professeur),
        cours=await _total(db, Cours),
        sessions=await _total(db, Session),
        embeddings_professeurs=n_emb_professeurs,
        embeddings_cours=n_emb_cours,
    )
