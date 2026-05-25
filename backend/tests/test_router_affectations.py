"""Tests pour le router affectations — POST /api/affectations/generer."""

from decimal import Decimal

import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation
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
