"""Tests endpoints /api/cours/{cours_id}/competences."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence


async def _make_cours(db_session: AsyncSession, code: str = "INF1001") -> Cours:
    c = Cours(code=code, nom="Cours test")
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c


@pytest.mark.asyncio
async def test_create_competence_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    r = await client.post(
        f"/api/cours/{c.id}/competences",
        json={"nom": "Python", "importance": 4},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["nom"] == "Python"
    assert data["importance"] == 4
    assert data["cours_id"] == c.id


@pytest.mark.asyncio
async def test_create_competence_importance_par_defaut(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    r = await client.post(
        f"/api/cours/{c.id}/competences",
        json={"nom": "Django"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["importance"] == 3


@pytest.mark.asyncio
async def test_create_competence_cours_inconnu(
    client: AsyncClient, auth_headers_admin: dict
):
    r = await client.post(
        "/api/cours/999/competences",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_competence_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    r = await client.post(
        f"/api/cours/{c.id}/competences",
        json={"nom": "X"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_competences(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    db_session.add_all([
        CoursCompetence(cours_id=c.id, nom="Python", importance=5),
        CoursCompetence(cours_id=c.id, nom="SQL", importance=3),
    ])
    await db_session.commit()
    r = await client.get(f"/api/cours/{c.id}/competences", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    noms = sorted(d["nom"] for d in data)
    assert noms == ["Python", "SQL"]


@pytest.mark.asyncio
async def test_list_competences_rh_autorise(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    r = await client.get(f"/api/cours/{c.id}/competences", headers=auth_headers_rh)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_update_competence_importance(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    comp = CoursCompetence(cours_id=c.id, nom="Python", importance=2)
    db_session.add(comp)
    await db_session.commit()
    await db_session.refresh(comp)
    r = await client.put(
        f"/api/cours/{c.id}/competences/{comp.id}",
        json={"importance": 5},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert r.json()["importance"] == 5


@pytest.mark.asyncio
async def test_update_competence_mauvais_cours(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c1 = await _make_cours(db_session, code="A1")
    c2 = await _make_cours(db_session, code="A2")
    comp = CoursCompetence(cours_id=c1.id, nom="X", importance=3)
    db_session.add(comp)
    await db_session.commit()
    await db_session.refresh(comp)
    r = await client.put(
        f"/api/cours/{c2.id}/competences/{comp.id}",
        json={"importance": 5},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_competence(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    comp = CoursCompetence(cours_id=c.id, nom="Python", importance=3)
    db_session.add(comp)
    await db_session.commit()
    await db_session.refresh(comp)
    comp_id = comp.id
    r = await client.delete(
        f"/api/cours/{c.id}/competences/{comp_id}", headers=auth_headers_admin
    )
    assert r.status_code == 204
    found = await db_session.execute(
        select(CoursCompetence).where(CoursCompetence.id == comp_id)
    )
    assert found.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_competence_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session)
    comp = CoursCompetence(cours_id=c.id, nom="Python", importance=3)
    db_session.add(comp)
    await db_session.commit()
    await db_session.refresh(comp)
    r = await client.delete(
        f"/api/cours/{c.id}/competences/{comp.id}", headers=auth_headers_rh
    )
    assert r.status_code == 403
