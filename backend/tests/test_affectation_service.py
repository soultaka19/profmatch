"""Tests du service d'affectation — modèles mockés, pas d'appels LLM."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import AffectationStatut
from app.models.ponderations_session import PonderationsSession
from app.services.affectation_service import (
    _bonus_historique,
    _score_comp_pondere,
    valider_affectation,
    ajouter_feedback,
    update_ponderations,
)
from app.services.scoring import PoidsScoring


# ── Helpers ─────────────────────────────────────────────────────────────────

def _make_cc(nom: str, importance: int = 3):
    cc = MagicMock()
    cc.nom = nom
    cc.importance = importance
    return cc


# ── W1 score pondéré ─────────────────────────────────────────────────────────

def test_score_comp_pondere_couverture_totale():
    ccs = [_make_cc("Python", 5), _make_cc("SQL", 3)]
    prof = {"Python", "SQL"}
    # (5+3)/(5+3) = 1.0
    score = _score_comp_pondere(prof, ccs)
    assert score == pytest.approx(Decimal("1.0"), abs=Decimal("0.001"))


def test_score_comp_pondere_couverture_partielle():
    ccs = [_make_cc("Python", 5), _make_cc("SQL", 3)]
    prof = {"Python"}
    # 5/(5+3) = 0.625
    score = _score_comp_pondere(prof, ccs)
    assert float(score) == pytest.approx(0.625, abs=0.001)


def test_score_comp_pondere_aucune_couverture():
    ccs = [_make_cc("Java", 5)]
    score = _score_comp_pondere({"Python"}, ccs)
    assert score == Decimal("0")


def test_score_comp_pondere_cours_sans_competences():
    score = _score_comp_pondere({"Python"}, [])
    assert score == Decimal("0")


def test_score_comp_pondere_case_insensitive():
    ccs = [_make_cc("python", 5)]
    # prof a "Python" avec majuscule
    score = _score_comp_pondere({"Python"}, ccs)
    assert float(score) == pytest.approx(1.0, abs=0.001)


# ── valider_affectation ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_valider_affectation_ok(db_session: AsyncSession, professeur_prof, test_user_rh):
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from app.models.affectation import Affectation

    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    cours = Cours(code="T-001", nom="Test", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=professeur_prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.7"),
        score_comp=Decimal("0.7"),
        score_exp=Decimal("0.7"),
        score_hist=Decimal("0.7"),
        score_sem=Decimal("0.7"),
        statut=AffectationStatut.PROPOSEE,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    result = await valider_affectation(
        aff.id, test_user_rh.id, AffectationStatut.VALIDEE, db_session
    )
    assert result.statut == AffectationStatut.VALIDEE
    assert result.valide_par_user_id == test_user_rh.id
    assert result.valide_le is not None


@pytest.mark.asyncio
async def test_valider_affectation_inexistante(db_session: AsyncSession):
    with pytest.raises(ValueError, match="introuvable"):
        await valider_affectation(99999, 1, AffectationStatut.VALIDEE, db_session)


# ── ajouter_feedback ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ajouter_feedback_ok(db_session: AsyncSession, professeur_prof, test_user_rh):
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from app.models.affectation import Affectation

    sess = Session(annee=2026, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    cours = Cours(code="T-002", nom="Feedback", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.8"), score_comp=Decimal("0.8"),
        score_exp=Decimal("0.8"), score_hist=Decimal("0.8"), score_sem=Decimal("0.8"),
        statut=AffectationStatut.VALIDEE,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    fb = await ajouter_feedback(aff.id, test_user_rh.id, 4, "Bon profil", db_session)
    assert fb.note == 4
    assert fb.valide_par_user_id == test_user_rh.id


# ── update_ponderations ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_ponderations_ok(db_session: AsyncSession):
    from app.models.session import Session, Semestre
    from sqlalchemy import select

    sess = Session(annee=2027, semestre=Semestre.PRINTEMPS)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    # ponderations auto-créées par listener
    pond = await update_ponderations(
        sess.id,
        w1=Decimal("0.500"),
        w2=Decimal("0.300"),
        w3=Decimal("0.100"),
        w4=Decimal("0.100"),
        db=db_session,
    )
    assert pond.w1 == Decimal("0.500")
    assert pond.w2 == Decimal("0.300")


@pytest.mark.asyncio
async def test_update_ponderations_session_inexistante(db_session: AsyncSession):
    with pytest.raises(ValueError):
        await update_ponderations(
            99999,
            w1=Decimal("0.4"), w2=Decimal("0.3"),
            w3=Decimal("0.2"), w4=Decimal("0.1"),
            db=db_session,
        )
