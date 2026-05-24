"""Tests endpoints /api/admin/utilisateurs."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_utilisateur_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "newprof@test.ca",
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "Nouveau Prof",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "newprof@test.ca"
    assert data["role"] == "prof"
    assert data["actif"] is True
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_create_utilisateur_email_doublon(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "testprof@test.ca",
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "Doublon",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_utilisateur_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "x@test.ca",
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "X",
        },
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_utilisateur_password_trop_court(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "y@test.ca",
            "password": "abc",
            "role": "prof",
            "nom_complet": "Y",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_list_utilisateurs(client: AsyncClient, auth_headers_admin: dict, test_user_admin: User, test_user_prof: User, test_user_rh: User):
    r = await client.get("/api/admin/utilisateurs/", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    emails = {u["email"] for u in data}
    assert "testadmin@test.ca" in emails
    assert "testprof@test.ca" in emails
    assert "testrh@test.ca" in emails


@pytest.mark.asyncio
async def test_list_utilisateurs_filtre_actif(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession, test_user_admin: User):
    from app.core.security import hash_password
    u = User(email="inactif@test.ca", password_hash=hash_password("Test@1234"),
            role=UserRole.PROF, nom_complet="Inactif", actif=False)
    db_session.add(u)
    await db_session.commit()

    r = await client.get("/api/admin/utilisateurs/?actif=false", headers=auth_headers_admin)
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()}
    assert emails == {"inactif@test.ca"}


@pytest.mark.asyncio
async def test_get_utilisateur_par_id(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.get(f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["email"] == "testprof@test.ca"


@pytest.mark.asyncio
async def test_get_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/admin/utilisateurs/99999", headers=auth_headers_admin)
    assert r.status_code == 404
