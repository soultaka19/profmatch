"""Tests endpoints /api/sessions et /api/sessions/{id}/ponderations."""

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Semestre, Session, SessionStatut
from app.models.user import User


@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient, test_user_admin: User, auth_headers_admin: dict):
    r = await client.get("/api/sessions/", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_create_session_admin(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/sessions/",
        json={"annee": 2026, "semestre": "automne"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["annee"] == 2026
    assert data["semestre"] == "automne"
    assert data["statut"] == "planifiee"
    assert data["nom"] == "Automne 2026"


@pytest.mark.asyncio
async def test_create_session_doublon(client: AsyncClient, auth_headers_admin: dict):
    payload = {"annee": 2026, "semestre": "automne"}
    await client.post("/api/sessions/", json=payload, headers=auth_headers_admin)
    r = await client.post("/api/sessions/", json=payload, headers=auth_headers_admin)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_session_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/sessions/",
        json={"annee": 2026, "semestre": "hiver"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_ponderations_par_defaut(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.get(f"/api/sessions/{sess.id}/ponderations", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert float(data["w1"]) == pytest.approx(0.4)
    assert data["xai_actif"] is True


@pytest.mark.asyncio
async def test_update_ponderations(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2027, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}/ponderations",
        json={"w1": "0.500", "w2": "0.300", "w3": "0.100", "w4": "0.100"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert float(r.json()["w1"]) == pytest.approx(0.5)


@pytest.mark.asyncio
async def test_update_ponderations_invalides(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2028, semestre=Semestre.ETE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}/ponderations",
        json={"w1": "0.5", "w2": "0.5", "w3": "0.5", "w4": "0.5"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_list_programmes(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/programmes/", headers=auth_headers_admin)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_create_programme(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/programmes/",
        json={"code": "51046", "nom": "Programmation informatique", "departement": "Informatique"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["code"] == "51046"
