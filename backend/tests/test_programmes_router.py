"""Tests endpoints /api/programmes (PUT, DELETE et la suite du CRUD)."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.programme import Programme


@pytest.mark.asyncio
async def test_update_programme_admin_met_a_jour_nom(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="Programmation informatique", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)

    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "Programmation et développement"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom"] == "Programmation et développement"
    assert data["code"] == "51046"  # code immuable
    assert data["departement"] == "TI"  # champ non touché


@pytest.mark.asyncio
async def test_update_programme_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/programmes/999",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_programme_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "X"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403
