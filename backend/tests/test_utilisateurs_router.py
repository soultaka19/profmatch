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
