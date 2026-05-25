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
