"""Tests endpoint /api/admin/stats."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours


@pytest.mark.asyncio
async def test_stats_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.get("/api/admin/stats", headers=auth_headers_rh)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stats_refuse_prof(client: AsyncClient, auth_headers_prof: dict):
    r = await client.get("/api/admin/stats", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stats_compte_les_entites(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    db_session.add_all(
        [
            Cours(code="INF1001", nom="Intro", credits=3, heures=45),
            Cours(code="INF2001", nom="Algo", credits=3, heures=45),
        ]
    )
    await db_session.commit()

    r = await client.get("/api/admin/stats", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert data["cours_total"] == 2
    assert data["utilisateurs_total"] >= 1
    for key in (
        "professeurs_total",
        "cv_traites",
        "cv_en_attente",
        "programmes_total",
        "sessions_total",
        "sessions_ouvertes",
        "affectations_total",
        "affectations_validees",
    ):
        assert key in data and isinstance(data[key], int)
