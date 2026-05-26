"""Tests pour le router affectations."""

from decimal import Decimal

import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient
from sqlalchemy import select as _sel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.session import Semestre, Session
from app.models.user import User, UserRole


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


# ── GET /mes-affectations ────────────────────────────────────────────────────


async def _setup_mes_affectations(db_session: AsyncSession):
    """Crée un prof avec CV traité, une session, un cours et une affectation."""
    user = User(
        email="mesaff@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Prof MesAff",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    prof = (await db_session.execute(
        _sel(Professeur).where(Professeur.user_id == user.id)
    )).scalar_one()

    db_session.add(CV(
        professeur_id=prof.id,
        nom_original="cv.pdf",
        chemin_fichier="x.pdf",
        taille_octets=1,
        mime_type="application/pdf",
        statut=CVStatut.TRAITE,
    ))

    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    cours = Cours(code="MA-101", nom="Cours MesAff")
    db_session.add_all([sess, cours])
    await db_session.commit()
    await db_session.refresh(sess)
    await db_session.refresh(cours)

    aff = Affectation(
        session_id=sess.id,
        professeur_id=prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.840"),
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.750"),
        score_hist=Decimal("1.000"),
        score_sem=Decimal("0.620"),
        justification="• Compétences : ok\nRecommandation : Fortement recommandé.",
        statut=AffectationStatut.VALIDEE,
    )
    db_session.add(aff)
    await db_session.commit()

    from app.core.security import create_access_token
    token = create_access_token(subject=user.id, role=user.role.value)
    headers = {"Authorization": f"Bearer {token}"}
    return prof, sess, cours, aff, headers


@pytest.mark.asyncio
async def test_mes_affectations_retourne_ses_propres_affectations(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """GET /mes-affectations retourne uniquement les affectations du prof connecté."""
    prof, sess, cours, aff, headers = await _setup_mes_affectations(db_session)

    resp = await client.get("/api/affectations/mes-affectations", headers=headers)

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    item = body[0]
    assert item["id"] == aff.id
    assert item["session_nom"] == "Automne 2026"
    assert item["cours_code"] == "MA-101"
    assert item["cours_nom"] == "Cours MesAff"
    assert item["score_total"] == pytest.approx(0.840, abs=0.001)
    assert item["statut"] == "validee"
    assert item["justification"] is not None


@pytest.mark.asyncio
async def test_mes_affectations_liste_vide_si_aucune(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers_prof: dict[str, str],
):
    """Un prof sans affectation reçoit une liste vide — pas 404."""
    resp = await client.get("/api/affectations/mes-affectations", headers=auth_headers_prof)

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_mes_affectations_refuse_role_rh(
    client: AsyncClient,
    auth_headers_rh: dict[str, str],
):
    """GET /mes-affectations est réservé au rôle prof — un RH reçoit 403."""
    resp = await client.get("/api/affectations/mes-affectations", headers=auth_headers_rh)

    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_mes_affectations_refuse_sans_auth(client: AsyncClient):
    """Sans token, l'endpoint retourne 401."""
    resp = await client.get("/api/affectations/mes-affectations")

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_mes_affectations_isolation_entre_profs(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Deux profs ne voient pas les affectations de l'autre."""
    # Prof A avec 1 affectation
    _, _, _, _, headers_a = await _setup_mes_affectations(db_session)

    # Prof B distinct (même setup, email différent auto via _setup)
    user_b = User(
        email="profb@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Prof B",
    )
    db_session.add(user_b)
    await db_session.commit()
    await db_session.refresh(user_b)

    from app.core.security import create_access_token
    headers_b = {
        "Authorization": f"Bearer {create_access_token(subject=user_b.id, role='prof')}"
    }

    resp_b = await client.get("/api/affectations/mes-affectations", headers=headers_b)

    assert resp_b.status_code == 200
    # Prof B n'a aucune affectation — il ne voit pas celle de A
    assert resp_b.json() == []


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
