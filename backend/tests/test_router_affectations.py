"""Tests pour le router affectations — POST /api/affectations/generer."""

import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient


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
