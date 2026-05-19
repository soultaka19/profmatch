import pytest
from jose import jwt

from app.core.config import settings


@pytest.mark.asyncio
async def test_login_success(client, test_user_prof):
    response = await client.post(
        "/api/auth/login",
        json={"email": "testprof@test.ca", "password": "Test@1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "prof"
    assert data["nom_complet"] == "Test Prof"
    assert data["access_token"]
    payload = jwt.decode(
        data["access_token"], settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
    assert payload["sub"] == str(test_user_prof.id)
    assert payload["role"] == "prof"


@pytest.mark.asyncio
async def test_login_wrong_password(client, test_user_prof):
    response = await client.post(
        "/api/auth/login",
        json={"email": "testprof@test.ca", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email ou mot de passe incorrect"


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    response = await client.post(
        "/api/auth/login",
        json={"email": "nobody@test.ca", "password": "anything"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email ou mot de passe incorrect"


@pytest.mark.asyncio
async def test_me_returns_current_user(client, test_user_prof, auth_headers_prof):
    response = await client.get("/api/auth/me", headers=auth_headers_prof)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user_prof.id
    assert data["email"] == "testprof@test.ca"
    assert data["role"] == "prof"
    assert data["nom_complet"] == "Test Prof"
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_me_rejects_invalid_token(client):
    response = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401
