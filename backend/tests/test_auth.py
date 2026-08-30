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


@pytest.mark.asyncio
async def test_me_rejects_compte_desactive(client, db_session, test_user_prof, auth_headers_prof):
    """Un JWT émis avant la désactivation du compte (soft delete admin) ne doit
    plus donner accès : get_current_user renvoie 403 tant que actif=False."""
    # Le jeton fonctionne tant que le compte est actif
    response = await client.get("/api/auth/me", headers=auth_headers_prof)
    assert response.status_code == 200

    test_user_prof.actif = False
    await db_session.commit()

    response = await client.get("/api/auth/me", headers=auth_headers_prof)
    assert response.status_code == 403
    assert "désactivé" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_compte_non_active_renvoie_403(client, db_session):
    """Un compte créé par l'admin (password_hash NULL) ne peut pas se loger
    tant qu'il n'a pas activé son mot de passe."""
    from app.models.user import User, UserRole

    user = User(
        email="aactiver@test.ca",
        password_hash=None,
        role=UserRole.PROF,
        nom_complet="A Activer",
        actif=True,
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/auth/login",
        json={"email": "aactiver@test.ca", "password": "n-importe-quoi"},
    )
    assert response.status_code == 403
    assert "activ" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_activate_definit_password_et_retourne_token(client, db_session, auth_headers_admin):
    """Workflow complet : admin crée → token → utilisateur active → login OK."""
    # Étape 1 : admin crée un compte
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={"email": "nouveau@test.ca", "role": "prof", "nom_complet": "Nouveau"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    token = r.json()["activation_token"]

    # Étape 2 : utilisateur active avec le token
    r2 = await client.post(
        "/api/auth/activate",
        json={"token": token, "password": "MonNouveauPass456"},
    )
    assert r2.status_code == 200
    data = r2.json()
    assert data["role"] == "prof"
    assert data["nom_complet"] == "Nouveau"
    assert data["access_token"]

    # Étape 3 : le même utilisateur peut désormais se loger normalement
    r3 = await client.post(
        "/api/auth/login",
        json={"email": "nouveau@test.ca", "password": "MonNouveauPass456"},
    )
    assert r3.status_code == 200


@pytest.mark.asyncio
async def test_activate_refuse_token_invalide(client):
    r = await client.post(
        "/api/auth/activate",
        json={"token": "token-inexistant", "password": "Password1234"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_activate_refuse_password_court(client):
    r = await client.post(
        "/api/auth/activate",
        json={"token": "n-importe-quoi", "password": "abc"},
    )
    assert r.status_code == 422
