"""Tests du service de détail de justification (wireframe B).

Pour l'écran 'Match compétences', le frontend a besoin de plus que la
justification texte : compétences requises avec couverture, compétences
maîtrisées par le prof, années d'expérience, sessions précédentes
+ note RH moyenne, similarité sémantique. Ce service rassemble tout
ça en une seule requête (depuis l'id d'affectation)."""

from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.affectation_feedback import AffectationFeedback
from app.models.competence import Competence, CompetenceNiveau
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.experience import Experience
from app.models.session import Semestre, Session
from app.services.justification_detail import get_justification_detail


async def _make_prof(db, email: str, nom: str):
    from sqlalchemy import select

    from app.core.security import hash_password
    from app.models.cv import CV, CVStatut
    from app.models.professeur import Professeur
    from app.models.user import User, UserRole

    user = User(
        email=email,
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet=nom,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    prof = (await db.execute(select(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db.add(
        CV(
            professeur_id=prof.id,
            nom_original="cv.pdf",
            chemin_fichier="x",
            taille_octets=1,
            mime_type="application/pdf",
            statut=CVStatut.TRAITE,
        )
    )
    await db.commit()
    return prof


@pytest.mark.asyncio
async def test_justification_detail_compose_competences_requises_avec_couverture(
    db_session: AsyncSession,
):
    """Pour chaque compétence requise du cours, le service indique si elle est
    couverte par le prof. Insensible à la casse."""
    prof = await _make_prof(db_session, "j1@test.ca", "Jean Un")
    db_session.add_all(
        [
            Competence(professeur_id=prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE),
            Competence(professeur_id=prof.id, nom="SQL", niveau=CompetenceNiveau.INTERMEDIAIRE),
        ]
    )

    cours = Cours(code="JD-001", nom="Cours Détail")
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add_all(
        [
            CoursCompetence(cours_id=cours.id, nom="python", importance=5),
            CoursCompetence(cours_id=cours.id, nom="Docker", importance=3),
        ]
    )

    aff = Affectation(
        session_id=sess.id,
        professeur_id=prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.700"),
        score_comp=Decimal("0.625"),
        score_exp=Decimal("0.500"),
        score_hist=Decimal("0.000"),
        score_sem=Decimal("0.600"),
        statut=AffectationStatut.PROPOSEE,
        justification="texte de la justif",
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    detail = await get_justification_detail(aff.id, db_session)

    competences = {c.nom: c for c in detail.competences_requises}
    assert competences["python"].couverte is True
    assert competences["python"].importance == 5
    assert competences["Docker"].couverte is False
    # Compétences maîtrisées : sorties triées, insensibles à la casse en doublon
    assert "Python" in detail.competences_maitrisees
    assert "SQL" in detail.competences_maitrisees


@pytest.mark.asyncio
async def test_justification_detail_calcule_annees_experience(
    db_session: AsyncSession,
):
    """Années d'expérience = somme des durées de chaque expérience, en
    considérant l'année courante si annee_fin est None."""
    prof = await _make_prof(db_session, "j2@test.ca", "Jean Deux")
    db_session.add_all(
        [
            Experience(
                professeur_id=prof.id,
                poste="Dev",
                employeur="Acme",
                annee_debut=2015,
                annee_fin=2020,
            ),
            Experience(
                professeur_id=prof.id,
                poste="Lead",
                employeur="Foo",
                annee_debut=2020,
                annee_fin=2024,
            ),
        ]
    )

    cours = Cours(code="JD-002", nom="Cours D2")
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.5"),
        score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"),
        score_hist=Decimal("0.0"),
        score_sem=Decimal("0.5"),
        statut=AffectationStatut.PROPOSEE,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    detail = await get_justification_detail(aff.id, db_session)
    # 2015-2020 = 5 ans + 2020-2024 = 4 ans → 9 ans
    assert detail.annees_experience == 9


@pytest.mark.asyncio
async def test_justification_detail_remonte_historique_rh(
    db_session: AsyncSession,
):
    """Historique = nb sessions VALIDÉES + notées (toutes sessions hors la
    session courante) + moyenne des notes RH pour cette paire (prof, cours)."""
    prof = await _make_prof(db_session, "j3@test.ca", "Jean Trois")
    cours = Cours(code="JD-003", nom="Cours D3")
    sess_prev_a = Session(annee=2027, semestre=Semestre.HIVER)
    sess_prev_b = Session(annee=2028, semestre=Semestre.HIVER)
    sess_courante = Session(annee=2029, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess_prev_a, sess_prev_b, sess_courante])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess_prev_a)
    await db_session.refresh(sess_prev_b)
    await db_session.refresh(sess_courante)

    # 2 affectations VALIDEE sur sessions précédentes, notées 4 et 5
    for sess_prev, note in ((sess_prev_a, 4), (sess_prev_b, 5)):
        aff_prev = Affectation(
            session_id=sess_prev.id,
            professeur_id=prof.id,
            cours_id=cours.id,
            score_total=Decimal("0.8"),
            score_comp=Decimal("0.8"),
            score_exp=Decimal("0.8"),
            score_hist=Decimal("0.8"),
            score_sem=Decimal("0.8"),
            statut=AffectationStatut.VALIDEE,
        )
        db_session.add(aff_prev)
        await db_session.flush()
        db_session.add(AffectationFeedback(affectation_id=aff_prev.id, note=note))

    aff_courante = Affectation(
        session_id=sess_courante.id,
        professeur_id=prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.85"),
        score_comp=Decimal("0.85"),
        score_exp=Decimal("0.85"),
        score_hist=Decimal("0.85"),
        score_sem=Decimal("0.85"),
        statut=AffectationStatut.PROPOSEE,
    )
    db_session.add(aff_courante)
    await db_session.commit()
    await db_session.refresh(aff_courante)

    detail = await get_justification_detail(aff_courante.id, db_session)
    assert detail.nb_sessions_precedentes == 2
    assert detail.note_rh_moyenne == pytest.approx(4.5)


@pytest.mark.asyncio
async def test_justification_detail_inclut_scores_et_similarite(
    db_session: AsyncSession,
):
    """Les 4 scores + similarité sémantique brute (depuis embeddings ou
    fallback 0.0) sont retournés tels quels."""
    prof = await _make_prof(db_session, "j4@test.ca", "Jean Quatre")
    cours = Cours(code="JD-004", nom="Cours D4")
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.728"),
        score_comp=Decimal("0.812"),
        score_exp=Decimal("0.625"),
        score_hist=Decimal("0.000"),
        score_sem=Decimal("0.755"),
        statut=AffectationStatut.PROPOSEE,
        justification="ma justification narrative",
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    detail = await get_justification_detail(aff.id, db_session)
    assert detail.score_total == pytest.approx(0.728)
    assert detail.score_comp == pytest.approx(0.812)
    assert detail.score_exp == pytest.approx(0.625)
    assert detail.score_hist == pytest.approx(0.0)
    assert detail.score_sem == pytest.approx(0.755)
    assert detail.justification == "ma justification narrative"


@pytest.mark.asyncio
async def test_justification_detail_affectation_inexistante_leve(
    db_session: AsyncSession,
):
    with pytest.raises(ValueError, match="introuvable"):
        await get_justification_detail(999_999, db_session)
