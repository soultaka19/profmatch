"""Tests du service d'affectation — modèles mockés, pas d'appels LLM."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import AffectationStatut
from app.models.cours import Cours
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.ponderations_session import PonderationsSession
from app.models.programme import Programme
from app.models.session import Semestre, Session, SessionStatut
from app.services.affectation_service import (
    _bonus_historique,
    _charger_cours_par_programmes,
    _score_comp_pondere,
    _scorer_paire,
    ajouter_feedback,
    creer_affectation_manuelle,
    generer_affectations,
    lister_professeurs_disponibles,
    update_ponderations,
    valider_affectation,
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


# ── Helpers intégration ───────────────────────────────────────────────────────


async def _make_programme_int(
    db: AsyncSession, code: str, semestres: list[Semestre]
) -> Programme:
    prog = Programme(code=code, nom=f"Programme {code}", semestres_admission=semestres)
    db.add(prog)
    await db.flush()
    return prog


async def _make_session_int(db: AsyncSession, semestre: Semestre) -> Session:
    sess = Session(annee=2030, semestre=semestre, statut=SessionStatut.PLANIFIEE)
    db.add(sess)
    await db.flush()
    return sess


async def _make_cours_int(db: AsyncSession, code: str) -> Cours:
    cours = Cours(code=code, nom=f"Cours {code}")
    db.add(cours)
    await db.flush()
    return cours


async def _make_etape_int(
    db: AsyncSession, programme_id: int, ordre: int
) -> EtapeProgramme:
    etape = EtapeProgramme(programme_id=programme_id, ordre=ordre)
    db.add(etape)
    await db.flush()
    return etape


async def _make_lien_int(
    db: AsyncSession, programme_id: int, etape_id: int, cours_id: int
) -> CoursEtapeProgramme:
    lien = CoursEtapeProgramme(
        programme_id=programme_id,
        etape_id=etape_id,
        cours_id=cours_id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db.add(lien)
    await db.flush()
    return lien


# ── Tests _charger_cours_par_programmes ──────────────────────────────────────


@pytest.mark.asyncio
async def test_charger_cours_avec_etape_ids(db_session: AsyncSession):
    """Avec etape_ids, seuls les cours de ces étapes sont retournés."""
    prog = await _make_programme_int(db_session, "T-01", [Semestre.AUTOMNE])
    etape1 = await _make_etape_int(db_session, prog.id, 1)
    etape2 = await _make_etape_int(db_session, prog.id, 2)
    cours1 = await _make_cours_int(db_session, "C-001")
    cours2 = await _make_cours_int(db_session, "C-002")
    await _make_lien_int(db_session, prog.id, etape1.id, cours1.id)
    await _make_lien_int(db_session, prog.id, etape2.id, cours2.id)
    await db_session.commit()

    result = await _charger_cours_par_programmes(
        [prog.id], db_session, etape_ids=[etape1.id]
    )

    assert len(result) == 1
    assert result[0].id == cours1.id


@pytest.mark.asyncio
async def test_charger_cours_sans_etape_ids_retourne_tout(db_session: AsyncSession):
    """Sans etape_ids (None), tous les cours des programmes sont retournés."""
    prog = await _make_programme_int(db_session, "T-02", [Semestre.AUTOMNE])
    etape1 = await _make_etape_int(db_session, prog.id, 1)
    etape2 = await _make_etape_int(db_session, prog.id, 2)
    cours1 = await _make_cours_int(db_session, "C-003")
    cours2 = await _make_cours_int(db_session, "C-004")
    await _make_lien_int(db_session, prog.id, etape1.id, cours1.id)
    await _make_lien_int(db_session, prog.id, etape2.id, cours2.id)
    await db_session.commit()

    result = await _charger_cours_par_programmes(
        [prog.id], db_session, etape_ids=None
    )

    assert len(result) == 2


# ── Tests filtre programmes inéligibles ──────────────────────────────────────


@pytest.mark.asyncio
async def test_generer_tous_ineligibles(db_session: AsyncSession):
    """Programme STANDARD (Automne) en session ÉTÉ : inéligible.
    generer_affectations doit retourner ([], [prog_id]).
    ÉTÉ n'est dans aucun sessions_actives_for (AUTOMNE+HIVER pour STANDARD).
    """
    prog = await _make_programme_int(db_session, "T-03", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.ETE)
    await db_session.commit()

    affectations, exclus = await generer_affectations(sess.id, [prog.id], db_session)

    assert affectations == []
    assert prog.id in exclus


@pytest.mark.asyncio
async def test_generer_programme_ineligible_exclu(db_session: AsyncSession):
    """Programme STANDARD inéligible pour PRINTEMPS, CONTINU éligible.
    exclus_ids contient seulement le STANDARD.
    """
    prog_standard = await _make_programme_int(db_session, "T-04", [Semestre.AUTOMNE])
    prog_continu = await _make_programme_int(
        db_session,
        "T-05",
        [Semestre.AUTOMNE, Semestre.HIVER, Semestre.PRINTEMPS],
    )
    sess = await _make_session_int(db_session, Semestre.PRINTEMPS)
    await db_session.commit()

    _, exclus = await generer_affectations(
        sess.id, [prog_standard.id, prog_continu.id], db_session
    )

    assert prog_standard.id in exclus
    assert prog_continu.id not in exclus


# ── _scorer_paire (refactor) ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scorer_paire_competence_totale(db_session: AsyncSession, professeur_prof):
    from sqlalchemy import select as _sel
    from sqlalchemy.orm import selectinload
    from app.models.competence import Competence, CompetenceNiveau
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.professeur import Professeur

    db_session.add(Competence(professeur_id=professeur_prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE))
    cours = Cours(code="SC-01", nom="Cours Scoring")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()

    prof = (await db_session.execute(
        _sel(Professeur).where(Professeur.id == professeur_prof.id).options(
            selectinload(Professeur.user),
            selectinload(Professeur.competences),
            selectinload(Professeur.experiences),
        )
    )).scalar_one()
    ccs = (await db_session.execute(
        _sel(CoursCompetence).where(CoursCompetence.cours_id == cours.id)
    )).scalars().all()

    poids = PoidsScoring(w1=Decimal("1"), w2=Decimal("0"), w3=Decimal("0"), w4=Decimal("0"))
    score_total, composants, justification = await _scorer_paire(
        prof, cours, list(ccs), poids, 999, db_session
    )
    assert float(composants.score_comp) == pytest.approx(1.0, abs=0.001)
    assert float(score_total) == pytest.approx(1.0, abs=0.001)
    assert isinstance(justification, str) and justification


# ── Helper : prof avec CV traité ─────────────────────────────────────────────


async def _make_prof_traite(db, email, nom, comps):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.competence import Competence, CompetenceNiveau
    from sqlalchemy import select as _sel

    user = User(email=email, password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet=nom)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    prof = (await db.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
              taille_octets=1, mime_type="application/pdf", statut=CVStatut.TRAITE))
    for c in comps:
        db.add(Competence(professeur_id=prof.id, nom=c, niveau=CompetenceNiveau.AVANCE))
    await db.commit()
    return prof


# ── creer_affectation_manuelle ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_cree_validee(db_session, test_user_rh):
    from app.models.affectation import AffectationOrigine, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre

    prof = await _make_prof_traite(db_session, "p1@test.ca", "Prof Un", ["Python"])
    cours = Cours(code="M-001", nom="Manuel")
    sess = Session(annee=2031, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()

    aff = await creer_affectation_manuelle(sess.id, prof.id, cours.id, test_user_rh.id, db_session)
    assert aff.statut == AffectationStatut.VALIDEE
    assert aff.origine == AffectationOrigine.MANUEL
    assert aff.valide_par_user_id == test_user_rh.id
    assert aff.valide_le is not None
    assert aff.score_total is not None


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_upsert_sur_existante(db_session, test_user_rh):
    from sqlalchemy import func, select as _sel
    from app.models.affectation import Affectation, AffectationOrigine, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre

    prof = await _make_prof_traite(db_session, "p2@test.ca", "Prof Deux", ["Python"])
    cours = Cours(code="M-002", nom="Manuel2")
    sess = Session(annee=2032, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=prof.id, cours_id=cours.id,
        score_total=Decimal("0.3"), score_comp=Decimal("0.3"), score_exp=Decimal("0.3"),
        score_hist=Decimal("0.3"), score_sem=Decimal("0.3"), statut=AffectationStatut.PROPOSEE,
    ))
    await db_session.commit()

    aff = await creer_affectation_manuelle(sess.id, prof.id, cours.id, test_user_rh.id, db_session)
    assert aff.statut == AffectationStatut.VALIDEE
    assert aff.origine == AffectationOrigine.MANUEL
    nb = (await db_session.execute(
        _sel(func.count(Affectation.id)).where(
            Affectation.session_id == sess.id,
            Affectation.professeur_id == prof.id,
            Affectation.cours_id == cours.id,
        )
    )).scalar_one()
    assert nb == 1


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_prof_introuvable(db_session, test_user_rh):
    from app.models.session import Session, Semestre
    from app.models.cours import Cours
    cours = Cours(code="M-003", nom="X")
    sess = Session(annee=2033, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    with pytest.raises(ValueError, match="introuvable"):
        await creer_affectation_manuelle(sess.id, 99999, cours.id, test_user_rh.id, db_session)


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_cv_non_traite(db_session, test_user_rh, professeur_prof):
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    db_session.add(CV(professeur_id=professeur_prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    cours = Cours(code="M-004", nom="Y")
    sess = Session(annee=2034, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    with pytest.raises(ValueError, match="non traité"):
        await creer_affectation_manuelle(sess.id, professeur_prof.id, cours.id, test_user_rh.id, db_session)


# ── lister_professeurs_disponibles ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_deja_affectes(db_session):
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre

    pa = await _make_prof_traite(db_session, "a@test.ca", "Alice", ["Python"])
    pb = await _make_prof_traite(db_session, "b@test.ca", "Bob", ["Java"])
    cours = Cours(code="D-001", nom="Dispo")
    sess = Session(annee=2035, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=pa.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"), score_exp=Decimal("0.5"),
        score_hist=Decimal("0.5"), score_sem=Decimal("0.5"), statut=AffectationStatut.PROPOSEE,
    ))
    await db_session.commit()

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pb.id in ids
    assert pa.id not in ids


@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_non_traites(db_session, professeur_prof):
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre

    db_session.add(CV(professeur_id=professeur_prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    pt = await _make_prof_traite(db_session, "t@test.ca", "Traite", ["SQL"])
    cours = Cours(code="D-002", nom="Dispo2")
    sess = Session(annee=2036, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pt.id in ids
    assert professeur_prof.id not in ids
