"""Tests endpoint /api/cours (lecture seule pour admin et rh)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours


async def _make_cours(db_session: AsyncSession, code: str, nom: str) -> Cours:
    c = Cours(code=code, nom=nom, credits=3, heures=45)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c


@pytest.mark.asyncio
async def test_list_cours_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "INF2001", "Algorithmes")
    r = await client.get("/api/cours", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    codes = sorted(c["code"] for c in data)
    assert codes == ["INF1001", "INF2001"]


@pytest.mark.asyncio
async def test_list_cours_rh(client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro")
    r = await client.get("/api/cours", headers=auth_headers_rh)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_list_cours_refuse_prof(client: AsyncClient, auth_headers_prof: dict):
    r = await client.get("/api/cours", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_cours_recherche(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "MAT2001", "Calcul")
    r = await client.get("/api/cours?q=programmation", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "INF1001"
