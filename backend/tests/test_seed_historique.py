"""Tests du service de seed historique (alimente W3 pour la démo)."""

from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.session import Semestre, Session
from app.services.seed_historique import seed_historique_session


async def _make_proposees(
    db: AsyncSession,
    session_id: int,
    professeur_id: int,
    scores: list[float],
) -> list[Affectation]:
    """Crée N PROPOSEE de scores variés sur N cours distincts."""
    affs = []
    for i, score in enumerate(scores):
        cours = Cours(code=f"SH-{i:03d}", nom=f"Cours {i}")
        db.add(cours)
        await db.flush()
        aff = Affectation(
            session_id=session_id,
            professeur_id=professeur_id,
            cours_id=cours.id,
            score_total=Decimal(str(score)),
            score_comp=Decimal(str(score)),
            score_exp=Decimal(str(score)),
            score_hist=Decimal(str(score)),
            score_sem=Decimal(str(score)),
            statut=AffectationStatut.PROPOSEE,
        )
        db.add(aff)
        affs.append(aff)
    await db.commit()
    return affs


@pytest.mark.asyncio
async def test_seed_historique_valide_top_n_et_ajoute_feedback(
    db_session: AsyncSession, professeur_prof, test_user_rh
):
    """Les N affectations au meilleur score deviennent VALIDEE + reçoivent un feedback."""
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    affs = await _make_proposees(
        db_session, sess.id, professeur_prof.id, [0.4, 0.9, 0.7, 0.5]
    )

    result = await seed_historique_session(
        sess.id, test_user_rh.id, db_session, nb_cible=2, note=5
    )

    assert result.deja_alimente is False
    assert result.nb_validees == 2
    # Les 2 meilleurs scores (0.9 et 0.7) doivent être VALIDEE
    nb_validees = (await db_session.execute(
        select(func.count(Affectation.id)).where(
            Affectation.session_id == sess.id,
            Affectation.statut == AffectationStatut.VALIDEE,
        )
    )).scalar_one()
    assert nb_validees == 2
    # Chaque VALIDEE doit avoir un feedback noté 5
    feedbacks = (await db_session.execute(
        select(AffectationFeedback)
    )).scalars().all()
    assert len(feedbacks) == 2
    assert all(fb.note == 5 for fb in feedbacks)
    assert all(fb.valide_par_user_id == test_user_rh.id for fb in feedbacks)


@pytest.mark.asyncio
async def test_seed_historique_idempotent(
    db_session: AsyncSession, professeur_prof, test_user_rh
):
    """Un 2e appel sur la même session ne touche à rien."""
    sess = Session(annee=2031, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    await _make_proposees(
        db_session, sess.id, professeur_prof.id, [0.6, 0.8, 0.7]
    )

    await seed_historique_session(sess.id, test_user_rh.id, db_session, nb_cible=2)
    result = await seed_historique_session(
        sess.id, test_user_rh.id, db_session, nb_cible=2
    )

    assert result.deja_alimente is True
    assert result.nb_validees == 0
    nb_feedbacks = (await db_session.execute(
        select(func.count(AffectationFeedback.id))
    )).scalar_one()
    assert nb_feedbacks == 2  # toujours 2, pas de doublons


@pytest.mark.asyncio
async def test_seed_historique_aucune_proposee(
    db_session: AsyncSession, test_user_rh
):
    """Session sans propositions : aucun effet."""
    sess = Session(annee=2032, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    result = await seed_historique_session(sess.id, test_user_rh.id, db_session)

    assert result.deja_alimente is False
    assert result.nb_validees == 0
