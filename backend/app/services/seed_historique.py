"""Service de seed historique pour la démo W3.

Valide quelques affectations PROPOSEE sur une session passée et leur ajoute
un feedback RH noté, ce qui alimente le bonus historique W3 lors des
générations sur les sessions ultérieures.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.affectation_feedback import AffectationFeedback


@dataclass
class SeedHistoriqueResult:
    nb_validees: int
    deja_alimente: bool


async def seed_historique_session(
    session_id: int,
    rh_user_id: int,
    db: AsyncSession,
    nb_cible: int = 3,
    note: int = 4,
    commentaire: str = "Session démo — affectation validée par RH (seed).",
) -> SeedHistoriqueResult:
    """Idempotent : si la session a déjà ≥ nb_cible affectations VALIDEE notées,
    ne touche à rien. Sinon, prend les meilleures PROPOSEE par score, les
    passe à VALIDEE et leur attache un AffectationFeedback noté `note`/5."""
    nb_validees_notees = (
        await db.execute(
            select(func.count(func.distinct(Affectation.id)))
            .select_from(Affectation)
            .join(AffectationFeedback, AffectationFeedback.affectation_id == Affectation.id)
            .where(
                Affectation.session_id == session_id,
                Affectation.statut == AffectationStatut.VALIDEE,
            )
        )
    ).scalar_one()
    if nb_validees_notees >= nb_cible:
        return SeedHistoriqueResult(nb_validees=0, deja_alimente=True)

    candidates = (
        (
            await db.execute(
                select(Affectation)
                .where(
                    Affectation.session_id == session_id,
                    Affectation.statut == AffectationStatut.PROPOSEE,
                )
                .order_by(Affectation.score_total.desc())
                .limit(nb_cible)
            )
        )
        .scalars()
        .all()
    )

    if not candidates:
        return SeedHistoriqueResult(nb_validees=0, deja_alimente=False)

    now = datetime.datetime.now(datetime.timezone.utc)
    for aff in candidates:
        aff.statut = AffectationStatut.VALIDEE
        aff.valide_par_user_id = rh_user_id
        aff.valide_le = now
        db.add(
            AffectationFeedback(
                affectation_id=aff.id,
                note=note,
                commentaire=commentaire,
                valide_par_user_id=rh_user_id,
            )
        )
    await db.commit()
    return SeedHistoriqueResult(nb_validees=len(candidates), deja_alimente=False)
