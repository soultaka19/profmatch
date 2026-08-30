"""Tests du service d'affectation — modèles mockés, pas d'appels LLM."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

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
    _charger_cours_par_programmes,
    _score_comp_pondere,
    _scorer_paire,
    ajouter_feedback,
    creer_affectation_manuelle,
    generer_affectations,
    lister_etapes_avec_statut,
    lister_professeurs_disponibles,
    update_ponderations,
    valider_affectation,
)
from app.services.scoring import (
    ContexteJustification,
    PoidsScoring,
    generer_justification_statique,
)

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
    from app.models.affectation import Affectation
    from app.models.cours import Cours
    from app.models.session import Semestre, Session

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
    from app.models.affectation import Affectation
    from app.models.cours import Cours
    from app.models.session import Semestre, Session

    sess = Session(annee=2026, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    cours = Cours(code="T-002", nom="Feedback", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    aff = Affectation(
        session_id=sess.id,
        professeur_id=professeur_prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.8"),
        score_comp=Decimal("0.8"),
        score_exp=Decimal("0.8"),
        score_hist=Decimal("0.8"),
        score_sem=Decimal("0.8"),
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

    from app.models.session import Semestre, Session

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
            w1=Decimal("0.4"),
            w2=Decimal("0.3"),
            w3=Decimal("0.2"),
            w4=Decimal("0.1"),
            db=db_session,
        )


# ── Helpers intégration ───────────────────────────────────────────────────────


async def _make_programme_int(db: AsyncSession, code: str, semestres: list[Semestre]) -> Programme:
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


async def _make_etape_int(db: AsyncSession, programme_id: int, ordre: int) -> EtapeProgramme:
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

    result = await _charger_cours_par_programmes([prog.id], db_session, etape_ids=[etape1.id])

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

    result = await _charger_cours_par_programmes([prog.id], db_session, etape_ids=None)

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

    _, exclus = await generer_affectations(sess.id, [prog_standard.id, prog_continu.id], db_session)

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

    db_session.add(
        Competence(professeur_id=professeur_prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE)
    )
    cours = Cours(code="SC-01", nom="Cours Scoring")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()

    prof = (
        await db_session.execute(
            _sel(Professeur)
            .where(Professeur.id == professeur_prof.id)
            .options(
                selectinload(Professeur.user),
                selectinload(Professeur.competences),
                selectinload(Professeur.experiences),
            )
        )
    ).scalar_one()
    ccs = (
        (
            await db_session.execute(
                _sel(CoursCompetence).where(CoursCompetence.cours_id == cours.id)
            )
        )
        .scalars()
        .all()
    )

    poids = PoidsScoring(w1=Decimal("1"), w2=Decimal("0"), w3=Decimal("0"), w4=Decimal("0"))
    # _scorer_paire est désormais pur (sync) ; bonus W3 fourni via un map préchargé.
    score_total, composants, ctx = _scorer_paire(prof, cours, list(ccs), poids, {})
    assert float(composants.score_comp) == pytest.approx(1.0, abs=0.001)
    assert float(score_total) == pytest.approx(1.0, abs=0.001)
    # _scorer_paire retourne désormais le contexte ; la rédaction (LLM/statique)
    # est déléguée à l'orchestrateur via _rediger_justification.
    assert isinstance(ctx, ContexteJustification)
    assert generer_justification_statique(ctx)


# ── Helper : prof avec CV traité ─────────────────────────────────────────────


async def _make_prof_traite(db, email, nom, comps):
    from sqlalchemy import select as _sel

    from app.core.security import hash_password
    from app.models.competence import Competence, CompetenceNiveau
    from app.models.cv import CV, CVStatut
    from app.models.professeur import Professeur
    from app.models.user import User, UserRole

    user = User(
        email=email, password_hash=hash_password("Test@1234"), role=UserRole.PROF, nom_complet=nom
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    prof = (await db.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
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
    from app.models.session import Semestre, Session

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
    from sqlalchemy import func
    from sqlalchemy import select as _sel

    from app.models.affectation import Affectation, AffectationOrigine, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Semestre, Session

    prof = await _make_prof_traite(db_session, "p2@test.ca", "Prof Deux", ["Python"])
    cours = Cours(code="M-002", nom="Manuel2")
    sess = Session(annee=2032, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=prof.id,
            cours_id=cours.id,
            score_total=Decimal("0.3"),
            score_comp=Decimal("0.3"),
            score_exp=Decimal("0.3"),
            score_hist=Decimal("0.3"),
            score_sem=Decimal("0.3"),
            statut=AffectationStatut.PROPOSEE,
        )
    )
    await db_session.commit()

    aff = await creer_affectation_manuelle(sess.id, prof.id, cours.id, test_user_rh.id, db_session)
    assert aff.statut == AffectationStatut.VALIDEE
    assert aff.origine == AffectationOrigine.MANUEL
    nb = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.professeur_id == prof.id,
                Affectation.cours_id == cours.id,
            )
        )
    ).scalar_one()
    assert nb == 1


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_prof_introuvable(db_session, test_user_rh):
    from app.models.cours import Cours
    from app.models.session import Semestre, Session

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
    from app.models.cours import Cours
    from app.models.cv import CV, CVStatut
    from app.models.session import Semestre, Session

    db_session.add(
        CV(
            professeur_id=professeur_prof.id,
            nom_original="cv.pdf",
            chemin_fichier="x",
            taille_octets=1,
            mime_type="application/pdf",
            statut=CVStatut.EN_ATTENTE,
        )
    )
    cours = Cours(code="M-004", nom="Y")
    sess = Session(annee=2034, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    with pytest.raises(ValueError, match="non traité"):
        await creer_affectation_manuelle(
            sess.id, professeur_prof.id, cours.id, test_user_rh.id, db_session
        )


# ── lister_professeurs_disponibles ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_deja_affectes(db_session):
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours import Cours
    from app.models.session import Semestre, Session

    pa = await _make_prof_traite(db_session, "a@test.ca", "Alice", ["Python"])
    pb = await _make_prof_traite(db_session, "b@test.ca", "Bob", ["Java"])
    cours = Cours(code="D-001", nom="Dispo")
    sess = Session(annee=2035, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=pa.id,
            cours_id=cours.id,
            score_total=Decimal("0.5"),
            score_comp=Decimal("0.5"),
            score_exp=Decimal("0.5"),
            score_hist=Decimal("0.5"),
            score_sem=Decimal("0.5"),
            statut=AffectationStatut.PROPOSEE,
        )
    )
    await db_session.commit()

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pb.id in ids
    assert pa.id not in ids


@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_non_traites(db_session, professeur_prof):
    from app.models.cours import Cours
    from app.models.cv import CV, CVStatut
    from app.models.session import Semestre, Session

    db_session.add(
        CV(
            professeur_id=professeur_prof.id,
            nom_original="cv.pdf",
            chemin_fichier="x",
            taille_octets=1,
            mime_type="application/pdf",
            statut=CVStatut.EN_ATTENTE,
        )
    )
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


@pytest.mark.asyncio
async def test_lister_profs_dispo_inclut_rejetes(db_session):
    """Un prof rejeté pour ce cours reste disponible (le RH peut revenir sur un rejet)."""
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours import Cours
    from app.models.session import Semestre, Session

    pr = await _make_prof_traite(db_session, "rej@test.ca", "Rejete", ["Python"])
    cours = Cours(code="D-003", nom="Dispo3")
    sess = Session(annee=2037, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=pr.id,
            cours_id=cours.id,
            score_total=Decimal("0.4"),
            score_comp=Decimal("0.4"),
            score_exp=Decimal("0.4"),
            score_hist=Decimal("0.4"),
            score_sem=Decimal("0.4"),
            statut=AffectationStatut.REJETEE,
        )
    )
    await db_session.commit()

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pr.id in ids


# ── lister_etapes_avec_statut (P1) ───────────────────────────────────────────


async def _valider_aff(db, sess_id, prof_id, cours_id):
    from app.models.affectation import Affectation, AffectationStatut

    db.add(
        Affectation(
            session_id=sess_id,
            professeur_id=prof_id,
            cours_id=cours_id,
            score_total=Decimal("0.8"),
            score_comp=Decimal("0.8"),
            score_exp=Decimal("0.8"),
            score_hist=Decimal("0.8"),
            score_sem=Decimal("0.8"),
            statut=AffectationStatut.VALIDEE,
        )
    )
    await db.flush()


@pytest.mark.asyncio
async def test_etape_complete_quand_tous_cours_valides(db_session):
    prof = await _make_prof_traite(db_session, "e1@test.ca", "E1", ["Python"])
    prog = await _make_programme_int(db_session, "EL-01", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "EL-C1")
    c2 = await _make_cours_int(db_session, "EL-C2")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await _make_lien_int(db_session, prog.id, etape.id, c2.id)
    await db_session.flush()
    await _valider_aff(db_session, sess.id, prof.id, c1.id)
    await _valider_aff(db_session, sess.id, prof.id, c2.id)
    await db_session.commit()

    res = await lister_etapes_avec_statut(sess.id, prog.id, db_session)
    assert len(res) == 1
    assert res[0].total_cours == 2
    assert res[0].cours_couverts == 2
    assert res[0].affectation_complete is True


@pytest.mark.asyncio
async def test_etape_incomplete_si_un_cours_sans_validee(db_session):
    prof = await _make_prof_traite(db_session, "e2@test.ca", "E2", ["Python"])
    prog = await _make_programme_int(db_session, "EL-02", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "EL-C3")
    c2 = await _make_cours_int(db_session, "EL-C4")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await _make_lien_int(db_session, prog.id, etape.id, c2.id)
    await db_session.flush()
    await _valider_aff(db_session, sess.id, prof.id, c1.id)  # c2 non couvert
    await db_session.commit()

    res = await lister_etapes_avec_statut(sess.id, prog.id, db_session)
    assert res[0].affectation_complete is False
    assert res[0].cours_couverts == 1


@pytest.mark.asyncio
async def test_etape_rejetee_ne_couvre_pas(db_session):
    from app.models.affectation import Affectation, AffectationStatut

    prof = await _make_prof_traite(db_session, "e3@test.ca", "E3", ["Python"])
    prog = await _make_programme_int(db_session, "EL-03", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "EL-C5")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await db_session.flush()
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=prof.id,
            cours_id=c1.id,
            score_total=Decimal("0.5"),
            score_comp=Decimal("0.5"),
            score_exp=Decimal("0.5"),
            score_hist=Decimal("0.5"),
            score_sem=Decimal("0.5"),
            statut=AffectationStatut.REJETEE,
        )
    )
    await db_session.commit()

    res = await lister_etapes_avec_statut(sess.id, prog.id, db_session)
    assert res[0].affectation_complete is False


@pytest.mark.asyncio
async def test_etape_isolation_par_session(db_session):
    prof = await _make_prof_traite(db_session, "e4@test.ca", "E4", ["Python"])
    prog = await _make_programme_int(db_session, "EL-04", [Semestre.AUTOMNE])
    sess_a = await _make_session_int(db_session, Semestre.AUTOMNE)
    sess_b = await _make_session_int(db_session, Semestre.HIVER)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "EL-C6")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await db_session.flush()
    await _valider_aff(db_session, sess_a.id, prof.id, c1.id)  # validé en A seulement
    await db_session.commit()

    res_b = await lister_etapes_avec_statut(sess_b.id, prog.id, db_session)
    assert res_b[0].affectation_complete is False


@pytest.mark.asyncio
async def test_etape_neutralisee_si_aucun_candidat(db_session):
    """Décision 2 : aucun professeur au CV traité → cours neutralisé (couvert)."""
    prog = await _make_programme_int(db_session, "EL-05", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "EL-C7")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await db_session.commit()  # aucun prof traité créé

    res = await lister_etapes_avec_statut(sess.id, prog.id, db_session)
    assert res[0].affectation_complete is True


@pytest.mark.asyncio
async def test_etape_sans_cours_non_complete(db_session):
    prog = await _make_programme_int(db_session, "EL-06", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    await _make_etape_int(db_session, prog.id, 1)  # étape vide
    await db_session.commit()

    res = await lister_etapes_avec_statut(sess.id, prog.id, db_session)
    assert res[0].total_cours == 0
    assert res[0].affectation_complete is False


# ── generer_affectations : purge restreinte au périmètre (décision 6) ─────────


@pytest.mark.asyncio
async def test_generer_ne_purge_que_le_perimetre(db_session):
    """Générer l'étape 2 ne doit pas supprimer les PROPOSEE de l'étape 1."""
    from sqlalchemy import func
    from sqlalchemy import select as _sel

    from app.models.affectation import Affectation, AffectationStatut

    prof = await _make_prof_traite(db_session, "pp@test.ca", "PP", ["Python"])
    prog = await _make_programme_int(db_session, "PG-01", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    e1 = await _make_etape_int(db_session, prog.id, 1)
    e2 = await _make_etape_int(db_session, prog.id, 2)
    c1 = await _make_cours_int(db_session, "PG-C1")
    c2 = await _make_cours_int(db_session, "PG-C2")
    await _make_lien_int(db_session, prog.id, e1.id, c1.id)
    await _make_lien_int(db_session, prog.id, e2.id, c2.id)
    await db_session.flush()
    # proposée préexistante sur l'étape 1
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=prof.id,
            cours_id=c1.id,
            score_total=Decimal("0.6"),
            score_comp=Decimal("0.6"),
            score_exp=Decimal("0.6"),
            score_hist=Decimal("0.6"),
            score_sem=Decimal("0.6"),
            statut=AffectationStatut.PROPOSEE,
        )
    )
    await db_session.commit()

    # générer uniquement l'étape 2
    await generer_affectations(sess.id, [prog.id], db_session, etape_ids=[e2.id])

    nb_c1_proposees = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.cours_id == c1.id,
                Affectation.statut == AffectationStatut.PROPOSEE,
            )
        )
    ).scalar_one()
    assert nb_c1_proposees == 1  # l'étape 1 est préservée


# ── generer_affectations : régénération vs décisions (item 1) ─────────────────


@pytest.mark.asyncio
async def test_generer_apres_rejet_ne_collisionne_pas(db_session):
    """Régénérer un cours portant déjà une REJETEE ne doit pas violer l'unicité.

    Le prof rejeté n'est pas re-proposé (le rejet persiste), un autre candidat
    éligible prend sa place dans le top-3.
    """
    from sqlalchemy import func
    from sqlalchemy import select as _sel

    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours_competence import CoursCompetence

    pr = await _make_prof_traite(db_session, "rej-gen@test.ca", "Rejete", ["Python"])
    pb = await _make_prof_traite(db_session, "ok-gen@test.ca", "Bob", ["Python"])
    prog = await _make_programme_int(db_session, "RG-01", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "RG-C1")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    db_session.add(CoursCompetence(cours_id=c1.id, nom="Python", importance=5))
    await db_session.flush()
    # pr a été rejeté pour c1
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=pr.id,
            cours_id=c1.id,
            score_total=Decimal("0.5"),
            score_comp=Decimal("0.5"),
            score_exp=Decimal("0.5"),
            score_hist=Decimal("0.5"),
            score_sem=Decimal("0.5"),
            statut=AffectationStatut.REJETEE,
        )
    )
    await db_session.commit()

    # ne doit pas lever d'IntegrityError
    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )

    # le prof rejeté n'a pas de nouvelle PROPOSEE sur c1
    nb_pr_proposees = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.cours_id == c1.id,
                Affectation.professeur_id == pr.id,
                Affectation.statut == AffectationStatut.PROPOSEE,
            )
        )
    ).scalar_one()
    assert nb_pr_proposees == 0
    # la REJETEE est préservée
    nb_pr_rejetees = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.cours_id == c1.id,
                Affectation.professeur_id == pr.id,
                Affectation.statut == AffectationStatut.REJETEE,
            )
        )
    ).scalar_one()
    assert nb_pr_rejetees == 1
    # l'autre candidat éligible est proposé
    prop_prof_ids = {a.professeur_id for a in affectations if a.cours_id == c1.id}
    assert pb.id in prop_prof_ids
    assert pr.id not in prop_prof_ids


@pytest.mark.asyncio
async def test_generer_saute_cours_couvert_par_validee(db_session):
    """Un cours déjà couvert par une VALIDEE est sauté : aucune nouvelle PROPOSEE
    n'est créée pour lui et l'unicité n'est pas violée."""
    from sqlalchemy import func
    from sqlalchemy import select as _sel

    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours_competence import CoursCompetence

    pa = await _make_prof_traite(db_session, "val-gen@test.ca", "Alice", ["Python"])
    prog = await _make_programme_int(db_session, "RG-02", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    c1 = await _make_cours_int(db_session, "RG-C2")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    db_session.add(CoursCompetence(cours_id=c1.id, nom="Python", importance=5))
    await db_session.flush()
    # c1 déjà couvert par une VALIDEE
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=pa.id,
            cours_id=c1.id,
            score_total=Decimal("0.9"),
            score_comp=Decimal("0.9"),
            score_exp=Decimal("0.9"),
            score_hist=Decimal("0.9"),
            score_sem=Decimal("0.9"),
            statut=AffectationStatut.VALIDEE,
        )
    )
    await db_session.commit()

    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )

    # aucune PROPOSEE générée pour c1 (cours couvert sauté)
    nb_proposees = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.cours_id == c1.id,
                Affectation.statut == AffectationStatut.PROPOSEE,
            )
        )
    ).scalar_one()
    assert nb_proposees == 0
    assert all(a.cours_id != c1.id for a in affectations)
    # la VALIDEE est intacte
    nb_validees = (
        await db_session.execute(
            _sel(func.count(Affectation.id)).where(
                Affectation.session_id == sess.id,
                Affectation.cours_id == c1.id,
                Affectation.statut == AffectationStatut.VALIDEE,
            )
        )
    ).scalar_one()
    assert nb_validees == 1


# ── generer_affectations : score sémantique W4 (embeddings) ───────────────────


@pytest.mark.asyncio
async def test_generer_utilise_embedding_pour_score_semantique(db_session):
    """Quand prof et cours ont un embedding, le score W4 (sc_sem) est non nul.

    Régression : tant que les embeddings n'étaient jamais peuplés, la branche
    sémantique de `_scorer_paire` restait inerte et W4 valait toujours 0.
    """
    from app.models.cours_competence import CoursCompetence

    prof = await _make_prof_traite(db_session, "emb-gen@test.ca", "Emma", ["Python"])
    prog = await _make_programme_int(db_session, "EMB-P", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    cours = await _make_cours_int(db_session, "EMB-C")
    await _make_lien_int(db_session, prog.id, etape.id, cours.id)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    # embeddings non nuls de même dimension → similarité cosinus > 0
    prof.embedding = [0.10, 0.20, 0.30]
    cours.embedding = [0.10, 0.20, 0.25]
    await db_session.commit()

    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )

    aff = next(a for a in affectations if a.professeur_id == prof.id and a.cours_id == cours.id)
    assert aff.score_sem > Decimal("0")


# ── generer_affectations : justification XAI (LLM vs statique) ─────────────────


def _xai_llm_client():
    """Client LLM mocké renvoyant une justification XAI narrative valide."""
    import json as _json
    from unittest.mock import MagicMock as _MM

    client = _MM()
    contenu = _json.dumps(
        {
            "competences": "Analyse LLM des compétences.",
            "experience": "Analyse LLM de l'expérience.",
            "historique": "Analyse LLM de l'historique.",
            "semantique": "Analyse LLM sémantique.",
            "recommandation": "Recommandation narrative distinctive du LLM.",
        }
    )
    client.chat.completions.create.return_value = _MM(choices=[_MM(message=_MM(content=contenu))])
    return client


async def _setup_un_cours_un_prof(db_session, suffixe: str):
    from app.models.cours_competence import CoursCompetence

    await _make_prof_traite(db_session, f"xai-{suffixe}@test.ca", "Xavier", ["Python"])
    prog = await _make_programme_int(db_session, f"XAI-{suffixe}", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    cours = await _make_cours_int(db_session, f"XAI-C{suffixe}")
    await _make_lien_int(db_session, prog.id, etape.id, cours.id)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()
    return prog, sess, etape, cours


@pytest.mark.asyncio
async def test_generer_avec_xai_actif_pose_statique_et_n_enqueue_rien(db_session, monkeypatch):
    """xai_actif=True (Niveau 2bis) : la génération pose la justification
    STATIQUE et n'enqueue PLUS aucun enrichissement de masse — l'enrichissement
    LLM est désormais lazy (déclenché à la consultation). C'est ce qui supprime
    la saturation de la file Celery par les générations successives."""
    from app.models.affectation import JustificationStatut

    prog, sess, etape, cours = await _setup_un_cours_un_prof(db_session, "ON")

    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )

    aff = next(a for a in affectations if a.cours_id == cours.id)
    # Justification commitée = statique, statut cohérent
    assert "W1 =" in aff.justification
    assert aff.justification_statut == JustificationStatut.STATIQUE
    # La génération n'enqueue plus AUCUNE tâche d'enrichissement
    assert delays == []


@pytest.mark.asyncio
async def test_generer_avec_xai_inactif_produit_justification_statique(db_session):
    """xai_actif=False : justification statique, aucun appel LLM."""
    from sqlalchemy import select as _sel

    prog, sess, etape, cours = await _setup_un_cours_un_prof(db_session, "OFF")
    pond = (
        await db_session.execute(
            _sel(PonderationsSession).where(PonderationsSession.session_id == sess.id)
        )
    ).scalar_one()
    pond.xai_actif = False
    await db_session.commit()

    client = _xai_llm_client()
    with patch("app.services.llm_client.get_llm_client", return_value=client):
        affectations, _ = await generer_affectations(
            sess.id, [prog.id], db_session, etape_ids=[etape.id]
        )

    aff = next(a for a in affectations if a.cours_id == cours.id)
    assert "W1 =" in aff.justification  # gabarit statique
    client.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_generer_justification_reflete_historique_reel(db_session):
    """La justification mentionne le nombre réel de sessions précédentes et la
    note RH moyenne (corrige les valeurs jusque-là codées en dur à 0)."""
    from sqlalchemy import select as _sel

    from app.models.affectation import Affectation, AffectationStatut
    from app.models.affectation_feedback import AffectationFeedback
    from app.models.cours_competence import CoursCompetence

    prof = await _make_prof_traite(db_session, "hist@test.ca", "Henri", ["Python"])
    prog = await _make_programme_int(db_session, "HIST-P", [Semestre.AUTOMNE])
    sess_prev = await _make_session_int(db_session, Semestre.HIVER)
    sess_new = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    cours = await _make_cours_int(db_session, "HIST-C")
    await _make_lien_int(db_session, prog.id, etape.id, cours.id)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.flush()

    # Historique : affectation validée en session précédente + feedback RH note 4
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
    db_session.add(AffectationFeedback(affectation_id=aff_prev.id, note=4))

    pond = (
        await db_session.execute(
            _sel(PonderationsSession).where(PonderationsSession.session_id == sess_new.id)
        )
    ).scalar_one()
    pond.xai_actif = False  # justification statique déterministe
    await db_session.commit()

    affectations, _ = await generer_affectations(
        sess_new.id, [prog.id], db_session, etape_ids=[etape.id]
    )
    aff = next(a for a in affectations if a.cours_id == cours.id and a.professeur_id == prof.id)
    assert "1 session(s) précédente(s)" in aff.justification
    assert "4.0 sur 5" in aff.justification


# ── generer_affectations : découplage décision / narration LLM (Niveau 2) ────


@pytest.mark.asyncio
async def test_generer_commit_statique_immediatement(db_session, monkeypatch):
    """Niveau 2 : la génération commit IMMÉDIATEMENT toutes les affectations
    en STATIQUE et délègue la narration LLM à des tâches Celery asynchrones.

    Le RH voit son tableau en quelques secondes, jamais bloqué par le LLM.
    Contrat fort : `generer_affectations` ne fait AUCUN appel LLM en direct.
    """
    import time

    from app.models.affectation import JustificationStatut
    from app.models.cours_competence import CoursCompetence

    prog = await _make_programme_int(db_session, "DEC-P", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    for i in range(3):
        await _make_prof_traite(db_session, f"dec{i}@test.ca", f"Dec{i}", ["Python"])
    c1 = await _make_cours_int(db_session, "DEC-C1")
    c2 = await _make_cours_int(db_session, "DEC-C2")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    await _make_lien_int(db_session, prog.id, etape.id, c2.id)
    db_session.add(CoursCompetence(cours_id=c1.id, nom="Python", importance=5))
    db_session.add(CoursCompetence(cours_id=c2.id, nom="Python", importance=5))
    await db_session.commit()

    # Intercepter les delays d'enrichissement sans réellement déclencher la tâche
    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    start = time.perf_counter()
    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )
    elapsed = time.perf_counter() - start

    # Commit rapide (pas de blocage LLM, juste calcul + statique + insert)
    assert elapsed < 1.0, f"Génération trop lente ({elapsed:.2f}s)"
    # Toutes les affectations marquées STATIQUE
    assert all(a.justification_statut == JustificationStatut.STATIQUE for a in affectations)
    # Justifications statiques non vides
    assert all(a.justification and len(a.justification) > 20 for a in affectations)
    # AUCUN enrichissement enqueué à la génération (lazy à la consultation)
    assert delays == []


@pytest.mark.asyncio
async def test_generer_n_enqueue_rien_si_xai_inactif(db_session, monkeypatch):
    """Quand `xai_actif=False`, la génération ne déclenche AUCUNE tâche LLM :
    la justification statique est la version définitive, pas un placeholder."""
    from sqlalchemy import select as _sel

    from app.models.cours_competence import CoursCompetence
    from app.models.ponderations_session import PonderationsSession

    prog = await _make_programme_int(db_session, "OFF-P", [Semestre.AUTOMNE])
    sess = await _make_session_int(db_session, Semestre.AUTOMNE)
    etape = await _make_etape_int(db_session, prog.id, 1)
    await _make_prof_traite(db_session, "off@test.ca", "Off", ["Python"])
    c1 = await _make_cours_int(db_session, "OFF-C1")
    await _make_lien_int(db_session, prog.id, etape.id, c1.id)
    db_session.add(CoursCompetence(cours_id=c1.id, nom="Python", importance=5))
    pond = (
        await db_session.execute(
            _sel(PonderationsSession).where(PonderationsSession.session_id == sess.id)
        )
    ).scalar_one()
    pond.xai_actif = False
    await db_session.commit()

    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    await generer_affectations(sess.id, [prog.id], db_session, etape_ids=[etape.id])

    assert delays == []


# ── generer_affectations : parallélisation des appels LLM (perf) ──────────────


# Note : les anciens tests `test_generer_parallelise_les_appels_xai` et
# `test_generer_borne_la_concurrence_xai` ont été retirés. Le concept de
# « parallélisme borné des LLM dans la génération » n'existe plus depuis le
# Niveau 2 : la phase 2 ne fait plus aucun appel LLM. L'enrichissement
# narratif est désormais testé dans `test_affectation_enrichissement.py`,
# qui valide la tâche Celery dédiée (1 tentative, idempotence, fallback).


# ── _charger_bonus_historique : préagrégation W3 (anti N+1) ───────────────────


@pytest.mark.asyncio
async def test_charger_bonus_historique_agrege(db_session):
    """Une seule requête agrège l'historique de toutes les paires (prof, cours)
    hors session courante : {(prof, cours): (bonus, nb_sessions, note_moy)}."""
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.affectation_feedback import AffectationFeedback
    from app.services.affectation_service import _charger_bonus_historique

    prof = await _make_prof_traite(db_session, "agg@test.ca", "Aggreg", ["Python"])
    cours = await _make_cours_int(db_session, "AGG-C")
    s1 = await _make_session_int(db_session, Semestre.HIVER)
    s2 = await _make_session_int(db_session, Semestre.PRINTEMPS)
    s_courante = await _make_session_int(db_session, Semestre.AUTOMNE)
    await db_session.flush()
    for s, note in ((s1, 4), (s2, 5)):
        aff = Affectation(
            session_id=s.id,
            professeur_id=prof.id,
            cours_id=cours.id,
            score_total=Decimal("0.8"),
            score_comp=Decimal("0.8"),
            score_exp=Decimal("0.8"),
            score_hist=Decimal("0.8"),
            score_sem=Decimal("0.8"),
            statut=AffectationStatut.VALIDEE,
        )
        db_session.add(aff)
        await db_session.flush()
        db_session.add(AffectationFeedback(affectation_id=aff.id, note=note))
    await db_session.commit()

    bonus_map = await _charger_bonus_historique(s_courante.id, db_session)

    assert (prof.id, cours.id) in bonus_map
    bonus, nb, note_moy = bonus_map[(prof.id, cours.id)]
    assert nb == 2
    assert note_moy == pytest.approx(4.5)
    assert bonus == pytest.approx(0.9)  # note_moy / 5


# ── declencher_enrichissement_si_besoin : enrichissement XAI lazy ─────────────


async def _aff_statique(db_session, suffixe: str):
    """Génère 1 cours / 1 prof et retourne l'unique affectation STATIQUE."""
    prog, sess, etape, cours = await _setup_un_cours_un_prof(db_session, suffixe)
    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )
    return affectations[0]


@pytest.mark.asyncio
async def test_declencher_enrichissement_enqueue_une_fois_et_flip_en_cours(db_session, monkeypatch):
    """1er appel : statut STATIQUE → EN_COURS + 1 enqueue. La narration LLM
    n'est plus déclenchée en masse, mais à la consultation de CETTE ligne."""
    from app.models.affectation import JustificationStatut
    from app.services.affectation_service import declencher_enrichissement_si_besoin

    aff = await _aff_statique(db_session, "LAZ1")
    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    res = await declencher_enrichissement_si_besoin(aff.id, db_session)
    await db_session.refresh(aff)

    assert res == {"statut": "en_cours"}
    assert aff.justification_statut == JustificationStatut.EN_COURS
    assert len(delays) == 1
    assert delays[0][0] == aff.id
    # ctx_dict sérialisé est exploitable par la tâche (clés clés présentes)
    assert delays[0][1]["code_cours"]
    assert "poids" in delays[0][1] and "composants" in delays[0][1]


@pytest.mark.asyncio
async def test_declencher_enrichissement_idempotent_sur_polling(db_session, monkeypatch):
    """Le polling du front rappelle l'endpoint : le 2e passage (EN_COURS) ne
    doit PAS re-enqueue — sinon on relance le LLM à chaque tick."""
    from app.services.affectation_service import declencher_enrichissement_si_besoin

    aff = await _aff_statique(db_session, "LAZ2")
    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    await declencher_enrichissement_si_besoin(aff.id, db_session)
    res2 = await declencher_enrichissement_si_besoin(aff.id, db_session)

    assert res2 == {"skip": "en_cours"}
    assert len(delays) == 1  # un seul enqueue malgré 2 appels


@pytest.mark.asyncio
async def test_declencher_enrichissement_noop_si_xai_inactif(db_session, monkeypatch):
    """xai_actif=False : la statique est définitive, aucun enqueue."""
    from sqlalchemy import select as _sel

    from app.services.affectation_service import declencher_enrichissement_si_besoin

    prog, sess, etape, cours = await _setup_un_cours_un_prof(db_session, "LAZ3")
    pond = (
        await db_session.execute(
            _sel(PonderationsSession).where(PonderationsSession.session_id == sess.id)
        )
    ).scalar_one()
    pond.xai_actif = False
    await db_session.commit()
    affectations, _ = await generer_affectations(
        sess.id, [prog.id], db_session, etape_ids=[etape.id]
    )
    aff = affectations[0]

    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    res = await declencher_enrichissement_si_besoin(aff.id, db_session)

    assert res == {"skip": "xai_inactif"}
    assert delays == []


@pytest.mark.asyncio
async def test_declencher_enrichissement_noop_si_deja_enrichie(db_session, monkeypatch):
    """Une justification déjà ENRICHIE n'est jamais re-déclenchée."""
    from app.models.affectation import JustificationStatut
    from app.services.affectation_service import declencher_enrichissement_si_besoin

    aff = await _aff_statique(db_session, "LAZ4")
    aff.justification_statut = JustificationStatut.ENRICHIE
    await db_session.commit()

    delays: list[tuple] = []
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda aff_id, ctx_dict: delays.append((aff_id, ctx_dict)),
    )

    res = await declencher_enrichissement_si_besoin(aff.id, db_session)

    assert res == {"skip": "enrichie"}
    assert delays == []


@pytest.mark.asyncio
async def test_declencher_enrichissement_introuvable(db_session):
    from app.services.affectation_service import declencher_enrichissement_si_besoin

    res = await declencher_enrichissement_si_besoin(999999, db_session)
    assert res == {"skip": "introuvable"}
