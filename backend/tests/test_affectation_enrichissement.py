"""Tests du service d'enrichissement de justification XAI (Niveau 2).

L'enrichissement remplace la justification STATIQUE par une narration LLM
de qualité. Une seule tentative, idempotent, conserve la statique en cas
d'échec et marque le statut pour visibilité."""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import (
    Affectation,
    AffectationStatut,
    JustificationStatut,
)
from app.models.cours import Cours
from app.models.session import Semestre, Session
from app.services.affectation_enrichissement import enrichir_justification_xai


CTX_MINIMAL = {
    "nom_professeur": "Alice Test",
    "code_cours": "T-001",
    "titre_cours": "Cours Test",
    "nb_comp_couvertes": 3,
    "nb_comp_requises": 4,
    "competences_maitrisees": ["Python", "SQL", "Docker"],
    "annees_experience": 5,
    "nb_sessions_precedentes": 1,
    "note_rh_moyenne": 4.0,
    "similarite_semantique": 0.6,
    "score_global_pct": 75.0,
    "poids": {"w1": 0.4, "w2": 0.3, "w3": 0.2, "w4": 0.1},
    "composants": {
        "score_comp": 0.75, "score_exp": 0.5,
        "score_hist": 0.8, "score_sem": 0.6,
    },
}


async def _make_aff(db, prof_id, statut_just=JustificationStatut.STATIQUE) -> Affectation:
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db.add(sess)
    await db.commit()
    await db.refresh(sess)
    cours = Cours(code=f"E-{prof_id}", nom="Cours E")
    db.add(cours)
    await db.commit()
    await db.refresh(cours)
    aff = Affectation(
        session_id=sess.id, professeur_id=prof_id, cours_id=cours.id,
        score_total=Decimal("0.75"), score_comp=Decimal("0.75"),
        score_exp=Decimal("0.50"), score_hist=Decimal("0.80"),
        score_sem=Decimal("0.60"),
        statut=AffectationStatut.PROPOSEE,
        justification="JUSTIFICATION STATIQUE INITIALE.",
        justification_statut=statut_just,
    )
    db.add(aff)
    await db.commit()
    await db.refresh(aff)
    return aff


# ── Cas heureux : LLM répond une narration ────────────────────────────────────


@pytest.mark.asyncio
async def test_enrichir_remplace_par_narration_llm(db_session: AsyncSession, professeur_prof):
    """Quand le LLM répond, justification ← narration, statut ← ENRICHIE."""
    aff = await _make_aff(db_session, professeur_prof.id)
    NARRATION = "• Compétences : analyse narrative LLM …\n• Recommandation : …"

    with patch(
        "app.services.affectation_enrichissement._appeler_llm_strict",
        return_value=NARRATION,
    ):
        result = await enrichir_justification_xai(aff.id, CTX_MINIMAL, db_session)

    await db_session.refresh(aff)
    assert result["statut"] == JustificationStatut.ENRICHIE.value
    assert aff.justification == NARRATION
    assert aff.justification_statut == JustificationStatut.ENRICHIE


# ── Cas LLM injoignable : on garde la statique, on marque ECHEC ───────────────


@pytest.mark.asyncio
async def test_enrichir_echec_llm_conserve_statique(db_session: AsyncSession, professeur_prof):
    """LLM timeout/erreur : statique préservée, statut bascule ECHEC."""
    aff = await _make_aff(db_session, professeur_prof.id)
    statique_initiale = aff.justification

    with patch(
        "app.services.affectation_enrichissement._appeler_llm_strict",
        side_effect=TimeoutError("LLM injoignable"),
    ):
        result = await enrichir_justification_xai(aff.id, CTX_MINIMAL, db_session)

    await db_session.refresh(aff)
    assert result["statut"] == JustificationStatut.ECHEC.value
    assert aff.justification == statique_initiale  # statique préservée
    assert aff.justification_statut == JustificationStatut.ECHEC


# ── Idempotence : déjà ENRICHIE → skip ────────────────────────────────────────


@pytest.mark.asyncio
async def test_enrichir_idempotent_si_deja_enrichie(db_session: AsyncSession, professeur_prof):
    """Si la justification est déjà ENRICHIE, l'enrichissement skip sans
    appeler le LLM. Indispensable pour la sécurité de retry Celery."""
    aff = await _make_aff(db_session, professeur_prof.id, JustificationStatut.ENRICHIE)
    aff.justification = "NARRATION DÉJÀ EN PLACE"
    await db_session.commit()

    with patch(
        "app.services.affectation_enrichissement._appeler_llm_strict"
    ) as mock_llm:
        result = await enrichir_justification_xai(aff.id, CTX_MINIMAL, db_session)

    await db_session.refresh(aff)
    assert result["skip"] is True
    assert aff.justification == "NARRATION DÉJÀ EN PLACE"
    mock_llm.assert_not_called()


# ── Affectation inexistante : skip silencieux ─────────────────────────────────


@pytest.mark.asyncio
async def test_enrichir_skip_affectation_inexistante(db_session: AsyncSession):
    """Une affectation supprimée entre l'enqueue et l'exécution doit produire
    un skip silencieux, pas une exception qui fait retry la tâche Celery."""
    result = await enrichir_justification_xai(999_999, CTX_MINIMAL, db_session)
    assert result["skip"] is True
