"""Tests endpoints /api/programmes/{programme_id}/etapes."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _make_programme(db_session: AsyncSession, code: str = "51046") -> Programme:
    p = Programme(code=code, nom="Programmation", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest.mark.asyncio
async def test_create_etape_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    p = await _make_programme(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1, "nom": "Étape 1"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["programme_id"] == p.id
    assert data["ordre"] == 1
    assert data["nom"] == "Étape 1"


@pytest.mark.asyncio
async def test_create_etape_programme_inconnu(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/programmes/999/etapes",
        json={"ordre": 1},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_etape_ordre_doublon(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    db_session.add(EtapeProgramme(programme_id=p.id, ordre=1, nom="A"))
    await db_session.commit()
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1, "nom": "B"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_etape_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_etapes_tri_par_ordre(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    db_session.add_all([
        EtapeProgramme(programme_id=p.id, ordre=2, nom="Deux"),
        EtapeProgramme(programme_id=p.id, ordre=1, nom="Un"),
        EtapeProgramme(programme_id=p.id, ordre=3, nom="Trois"),
    ])
    await db_session.commit()
    r = await client.get(f"/api/programmes/{p.id}/etapes", headers=auth_headers_admin)
    assert r.status_code == 200
    ordres = [e["ordre"] for e in r.json()]
    assert ordres == [1, 2, 3]


@pytest.mark.asyncio
async def test_list_etapes_rh_autorise(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    r = await client.get(f"/api/programmes/{p.id}/etapes", headers=auth_headers_rh)
    assert r.status_code == 200
