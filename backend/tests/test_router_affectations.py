"""Tests pour le router affectations — POST /api/affectations/generer."""

from decimal import Decimal

import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut, JustificationStatut
from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Semestre, Session


@pytest.mark.asyncio
async def test_post_generer_avec_etape_ids(
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
):
    """POST /api/affectations/generer transmet etape_ids à la tâche Celery."""
    mock_result = MagicMock()
    mock_result.id = "test-task-id-etapes"

    with patch(
        "app.routers.affectations.generer_affectations_task.delay",
        return_value=mock_result,
    ) as mock_delay:
        resp = await client.post(
            "/api/affectations/generer",
            json={"session_id": 999, "programme_ids": [1], "etape_ids": [10, 20]},
            headers=auth_headers_rh,
        )

    assert resp.status_code == 202
    body = resp.json()
    assert body["task_id"] == "test-task-id-etapes"
    mock_delay.assert_called_once_with(999, [1], [10, 20])


@pytest.mark.asyncio
async def test_post_generer_sans_etape_ids(
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
):
    """Sans etape_ids, None est transmis (rétrocompatibilité)."""
    mock_result = MagicMock()
    mock_result.id = "test-task-id-no-etapes"

    with patch(
        "app.routers.affectations.generer_affectations_task.delay",
        return_value=mock_result,
    ) as mock_delay:
        resp = await client.post(
            "/api/affectations/generer",
            json={"session_id": 999, "programme_ids": [1]},
            headers=auth_headers_rh,
        )

    assert resp.status_code == 202
    mock_delay.assert_called_once_with(999, [1], None)


@pytest.mark.asyncio
async def test_post_generer_requires_rh_role(
    client: AsyncClient,
    auth_headers_prof: dict[str, str],
):
    """Un prof ne peut pas lancer la génération."""
    resp = await client.post(
        "/api/affectations/generer",
        json={"session_id": 1, "programme_ids": [1]},
        headers=auth_headers_prof,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_affectations_enrichit_noms(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers_rh: dict[str, str],
    professeur_prof: Professeur,
    test_user_prof,
):
    """GET /api/affectations/ retourne le nom du cours et du professeur."""
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    cours = Cours(code="25913 IFM", nom="Tests logiciels", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=professeur_prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.840"),
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.750"),
        score_hist=Decimal("1.000"),
        score_sem=Decimal("0.620"),
    )
    db_session.add(aff)
    await db_session.commit()

    resp = await client.get(
        f"/api/affectations/?session_id={sess.id}",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["cours_nom"] == "Tests logiciels"
    assert body[0]["cours_code"] == "25913 IFM"
    assert body[0]["professeur_nom"] == test_user_prof.nom_complet


@pytest.mark.asyncio
async def test_mes_affectations_prof_retourne_uniquement_ses_affectations(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers_prof: dict[str, str],
    professeur_prof: Professeur,
):
    """GET /api/affectations/mes-affectations isole les donnees du prof connecte."""
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from sqlalchemy import select as _sel

    session = Session(annee=2031, semestre=Semestre.AUTOMNE)
    cours_prof = Cours(code="PROF-101", nom="Cours du prof", credits=3)
    cours_autre = Cours(code="PROF-202", nom="Cours autre prof", credits=3)
    autre_user = User(
        email="autre.prof@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Autre Prof",
    )
    db_session.add_all([session, cours_prof, cours_autre, autre_user])
    await db_session.commit()
    await db_session.refresh(session)
    await db_session.refresh(cours_prof)
    await db_session.refresh(cours_autre)
    await db_session.refresh(autre_user)
    autre_prof = (
        await db_session.execute(_sel(Professeur).where(Professeur.user_id == autre_user.id))
    ).scalar_one()

    db_session.add_all(
        [
            Affectation(
                session_id=session.id,
                professeur_id=professeur_prof.id,
                cours_id=cours_prof.id,
                score_total=Decimal("0.840"),
                score_comp=Decimal("0.900"),
                score_exp=Decimal("0.800"),
                score_hist=Decimal("0.700"),
                score_sem=Decimal("0.600"),
                justification="Profil pertinent pour le cours.",
                statut=AffectationStatut.VALIDEE,
            ),
            Affectation(
                session_id=session.id,
                professeur_id=professeur_prof.id,
                cours_id=cours_autre.id,
                score_total=Decimal("0.640"),
                score_comp=Decimal("0.600"),
                score_exp=Decimal("0.600"),
                score_hist=Decimal("0.600"),
                score_sem=Decimal("0.600"),
                justification="Proposition non encore validee.",
                statut=AffectationStatut.PROPOSEE,
            ),
            Affectation(
                session_id=session.id,
                professeur_id=autre_prof.id,
                cours_id=cours_autre.id,
                score_total=Decimal("0.910"),
                score_comp=Decimal("0.900"),
                score_exp=Decimal("0.900"),
                score_hist=Decimal("0.900"),
                score_sem=Decimal("0.900"),
            ),
        ]
    )
    await db_session.commit()

    resp = await client.get("/api/affectations/mes-affectations", headers=auth_headers_prof)

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["cours_code"] == "PROF-101"
    assert body[0]["cours_nom"] == "Cours du prof"
    assert body[0]["session_nom"] == "Automne 2031"
    assert body[0]["justification"] == "Profil pertinent pour le cours."
    assert body[0]["statut"] == "validee"


@pytest.mark.asyncio
async def test_mes_affectations_refuse_rh_et_admin(
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
    auth_headers_admin: dict[str, str],
):
    """La consultation personnelle des affectations est reservee au role prof."""
    for headers in (auth_headers_rh, auth_headers_admin):
        resp = await client.get("/api/affectations/mes-affectations", headers=headers)
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_mes_affectations_prof_sans_fiche_retourne_liste_vide(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers_prof: dict[str, str],
    professeur_prof: Professeur,
):
    """Un compte prof sans ligne professeur ne fuit aucune donnee."""
    await db_session.delete(professeur_prof)
    await db_session.commit()

    resp = await client.get("/api/affectations/mes-affectations", headers=auth_headers_prof)

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_patch_valider_enrichit_noms(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers_rh: dict[str, str],
    professeur_prof: Professeur,
    test_user_prof,
):
    """PATCH /api/affectations/{id} retourne aussi cours_nom/code et professeur_nom
    (cohérence avec GET et POST /manuelle), pas seulement les champs bruts."""
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    cours = Cours(code="PCH-1", nom="Cours Patch", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=professeur_prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.800"),
        score_comp=Decimal("0.800"),
        score_exp=Decimal("0.800"),
        score_hist=Decimal("0.800"),
        score_sem=Decimal("0.800"),
        statut=AffectationStatut.PROPOSEE,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)

    resp = await client.patch(
        f"/api/affectations/{aff.id}",
        headers=auth_headers_rh,
        json={"statut": "validee"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["statut"] == "validee"
    assert body["cours_nom"] == "Cours Patch"
    assert body["cours_code"] == "PCH-1"
    assert body["professeur_nom"] == test_user_prof.nom_complet


# ── Override manuel (REV-04) ─────────────────────────────────────────────────


async def _setup_manuel(db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.competence import Competence, CompetenceNiveau
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre
    from sqlalchemy import select as _sel

    user = User(email="rprof@test.ca", password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet="Router Prof")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    prof = (await db_session.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db_session.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.TRAITE))
    db_session.add(Competence(professeur_id=prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE))
    cours = Cours(code="R-001", nom="RouterCours")
    sess = Session(annee=2040, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()
    return prof, cours, sess


@pytest.mark.asyncio
async def test_post_manuelle_201(client, db_session, auth_headers_rh):
    prof, cours, sess = await _setup_manuel(db_session)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": prof.id, "cours_id": cours.id,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["origine"] == "manuel"
    assert body["statut"] == "validee"
    assert body["professeur_id"] == prof.id


@pytest.mark.asyncio
async def test_post_manuelle_404_prof_inconnu(client, db_session, auth_headers_rh):
    _, cours, sess = await _setup_manuel(db_session)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": 99999, "cours_id": cours.id,
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_post_manuelle_409_cv_non_traite(client, db_session, auth_headers_rh):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from sqlalchemy import select as _sel

    user = User(email="naf@test.ca", password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet="Non Traite")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    prof = (await db_session.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db_session.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    cours = Cours(code="R-002", nom="C2")
    sess = Session(annee=2041, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": prof.id, "cours_id": cours.id,
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_professeurs_disponibles(client, db_session, auth_headers_rh):
    prof, cours, sess = await _setup_manuel(db_session)
    resp = await client.get(
        f"/api/affectations/professeurs-disponibles?session_id={sess.id}&cours_id={cours.id}",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert any(p["professeur_id"] == prof.id for p in body)


@pytest.mark.asyncio
async def test_list_affectations_filtre_par_etape(client, db_session, auth_headers_rh, professeur_prof):
    from app.models.programme import Programme
    from app.models.etape_programme import EtapeProgramme
    from app.models.cours_etape_programme import CoursEtapeProgramme, CategorieCours

    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    prog = Programme(code="FP-01", nom="P", semestres_admission=[Semestre.AUTOMNE])
    db_session.add_all([sess, prog])
    await db_session.commit()
    await db_session.refresh(sess)
    await db_session.refresh(prog)
    e1 = EtapeProgramme(programme_id=prog.id, ordre=1)
    e2 = EtapeProgramme(programme_id=prog.id, ordre=2)
    c1 = Cours(code="FP-C1", nom="Cours E1")
    c2 = Cours(code="FP-C2", nom="Cours E2")
    db_session.add_all([e1, e2, c1, c2])
    await db_session.commit()
    for e, c in ((e1, c1), (e2, c2)):
        await db_session.refresh(e)
        await db_session.refresh(c)
        db_session.add(CoursEtapeProgramme(programme_id=prog.id, etape_id=e.id,
                                           cours_id=c.id, categorie=CategorieCours.OBLIGATOIRE))
    for c in (c1, c2):
        db_session.add(Affectation(
            session_id=sess.id, professeur_id=professeur_prof.id, cours_id=c.id,
            score_total=Decimal("0.5"), score_comp=Decimal("0.5"), score_exp=Decimal("0.5"),
            score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
        ))
    await db_session.commit()

    # programme entier → 2 affectations
    resp = await client.get(
        f"/api/affectations/?session_id={sess.id}&programme_ids={prog.id}",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    # étape 1 seule → 1 affectation (cours E1)
    resp2 = await client.get(
        f"/api/affectations/?session_id={sess.id}&programme_ids={prog.id}&etape_ids={e1.id}",
        headers=auth_headers_rh,
    )
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert len(body2) == 1
    assert body2[0]["cours_id"] == c1.id


# ── GET /generation/{task_id} : statut + compteurs d'enrichissement (B1) ─────


@pytest.mark.asyncio
async def test_generation_status_pending_pas_de_totaux(
    client: AsyncClient, auth_headers_rh: dict[str, str]
):
    """Pendant que la tâche tourne (PENDING/STARTED), on renvoie juste le
    status. Aucun compteur d'enrichissement — la session n'est pas encore
    déterminée côté Celery, et le front affiche l'overlay pipeline."""
    fake = MagicMock()
    fake.state = "PENDING"
    with patch(
        "app.routers.affectations.AsyncResult", return_value=fake
    ):
        resp = await client.get(
            "/api/affectations/generation/tid-pending", headers=auth_headers_rh
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "pending"
    assert "totaux" not in body or body["totaux"] is None


@pytest.mark.asyncio
async def test_generation_status_done_avec_compteurs_enrichissement(
    db_session: AsyncSession,
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
    professeur_prof,
):
    """Quand la tâche est SUCCESS, la réponse contient le résultat ET les
    compteurs des justifications de la session — permet au front d'afficher
    'X / Y enrichies par l'IA' et de poller jusqu'à la fin de l'enrichissement.
    """
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    cours_list = []
    for i in range(5):
        c = Cours(code=f"GEN-{i}", nom=f"Gen {i}")
        db_session.add(c)
        cours_list.append(c)
    await db_session.commit()
    for c in cours_list:
        await db_session.refresh(c)

    statuts = [
        JustificationStatut.STATIQUE,
        JustificationStatut.STATIQUE,
        JustificationStatut.EN_COURS,
        JustificationStatut.ENRICHIE,
        JustificationStatut.ECHEC,
    ]
    for c, js in zip(cours_list, statuts):
        db_session.add(Affectation(
            session_id=sess.id, professeur_id=professeur_prof.id, cours_id=c.id,
            score_total=Decimal("0.7"), score_comp=Decimal("0.7"),
            score_exp=Decimal("0.7"), score_hist=Decimal("0.7"),
            score_sem=Decimal("0.7"),
            statut=AffectationStatut.PROPOSEE,
            justification_statut=js,
            justification="j",
        ))
    await db_session.commit()

    fake = MagicMock()
    fake.state = "SUCCESS"
    fake.get.return_value = {
        "session_id": sess.id, "nb_affectations": 5, "programmes_exclus": [],
    }
    with patch(
        "app.routers.affectations.AsyncResult", return_value=fake
    ):
        resp = await client.get(
            f"/api/affectations/generation/tid-done", headers=auth_headers_rh
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert body["totaux"] == {
        "total": 5, "statique": 2, "en_cours": 1, "enrichie": 1, "echec": 1,
    }
