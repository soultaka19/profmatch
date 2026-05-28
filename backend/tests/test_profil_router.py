import pytest


@pytest.mark.asyncio
async def test_get_profil_returns_current_user(client, test_user_prof, auth_headers_prof):
    response = await client.get("/api/profil/me", headers=auth_headers_prof)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user_prof.id
    assert data["email"] == "testprof@test.ca"
    assert data["nom_complet"] == "Test Prof"
    assert data["role"] == "prof"
    assert "cree_le" in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_get_profil_requires_auth(client):
    response = await client.get("/api/profil/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_profil_nom_complet(client, test_user_prof, auth_headers_prof):
    response = await client.patch(
        "/api/profil/me",
        json={"nom_complet": "Nouveau Nom"},
        headers=auth_headers_prof,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nom_complet"] == "Nouveau Nom"
    assert data["email"] == "testprof@test.ca"


@pytest.mark.asyncio
async def test_update_profil_nom_vide_rejete(client, auth_headers_prof):
    response = await client.patch(
        "/api/profil/me",
        json={"nom_complet": ""},
        headers=auth_headers_prof,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_change_password_success(client, auth_headers_prof):
    response = await client.put(
        "/api/profil/me/password",
        json={"current_password": "Test@1234", "new_password": "NewPass@5678"},
        headers=auth_headers_prof,
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_change_password_mauvais_actuel(client, auth_headers_prof):
    response = await client.put(
        "/api/profil/me/password",
        json={"current_password": "MauvaisMotDePasse!", "new_password": "NewPass@5678"},
        headers=auth_headers_prof,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Mot de passe actuel incorrect"


@pytest.mark.asyncio
async def test_change_password_trop_court(client, auth_headers_prof):
    response = await client.put(
        "/api/profil/me/password",
        json={"current_password": "Test@1234", "new_password": "court"},
        headers=auth_headers_prof,
    )
    assert response.status_code == 422
