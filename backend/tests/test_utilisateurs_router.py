"""Tests endpoints /api/admin/utilisateurs."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_utilisateur_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "newprof@test.ca",
            "role": "prof",
            "nom_complet": "Nouveau Prof",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    # La réponse contient maintenant {user, activation_token, activation_url}
    assert "user" in data
    assert data["user"]["email"] == "newprof@test.ca"
    assert data["user"]["role"] == "prof"
    assert data["user"]["actif"] is True
    assert data["user"]["est_active"] is False  # compte créé sans mot de passe
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]
    # Token d'activation présent
    assert isinstance(data["activation_token"], str) and len(data["activation_token"]) > 10
    assert data["activation_url"].endswith(f"?token={data['activation_token']}")


@pytest.mark.asyncio
async def test_create_utilisateur_email_doublon(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User
):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "testprof@test.ca",
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
            "role": "prof",
            "nom_complet": "X",
        },
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_utilisateur_refuse_role_admin(client: AsyncClient, auth_headers_admin: dict):
    """La création directe d'un compte admin est interdite (Literal['prof', 'rh'])."""
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "newadmin@test.ca",
            "role": "admin",
            "nom_complet": "Tentative",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_list_utilisateurs(
    client: AsyncClient,
    auth_headers_admin: dict,
    test_user_admin: User,
    test_user_prof: User,
    test_user_rh: User,
):
    r = await client.get("/api/admin/utilisateurs/", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    emails = {u["email"] for u in data}
    assert "testadmin@test.ca" in emails
    assert "testprof@test.ca" in emails
    assert "testrh@test.ca" in emails


@pytest.mark.asyncio
async def test_list_utilisateurs_filtre_actif(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession, test_user_admin: User
):
    from app.core.security import hash_password

    u = User(
        email="inactif@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Inactif",
        actif=False,
    )
    db_session.add(u)
    await db_session.commit()

    r = await client.get("/api/admin/utilisateurs/?actif=false", headers=auth_headers_admin)
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()}
    assert emails == {"inactif@test.ca"}


@pytest.mark.asyncio
async def test_get_utilisateur_par_id(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User
):
    r = await client.get(f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "testprof@test.ca"
    assert data["est_active"] is True  # fixture crée avec password_hash défini


@pytest.mark.asyncio
async def test_get_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/admin/utilisateurs/99999", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_utilisateur_nom_et_role(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User
):
    r = await client.put(
        f"/api/admin/utilisateurs/{test_user_prof.id}",
        json={"nom_complet": "Renommé", "role": "rh"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom_complet"] == "Renommé"
    assert data["role"] == "rh"


@pytest.mark.asyncio
async def test_update_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/admin/utilisateurs/99999",
        json={"nom_complet": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_utilisateur_soft(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User
):
    r = await client.delete(
        f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin
    )
    assert r.status_code == 200
    assert r.json()["actif"] is False

    r2 = await client.get(
        f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin
    )
    assert r2.status_code == 200
    assert r2.json()["actif"] is False


@pytest.mark.asyncio
async def test_restaurer_utilisateur(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User, db_session: AsyncSession
):
    test_user_prof.actif = False
    await db_session.commit()

    r = await client.post(
        f"/api/admin/utilisateurs/{test_user_prof.id}/restaurer", headers=auth_headers_admin
    )
    assert r.status_code == 200
    assert r.json()["actif"] is True


@pytest.mark.asyncio
async def test_delete_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/admin/utilisateurs/99999", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_admin_ne_peut_pas_se_desactiver(
    client: AsyncClient, auth_headers_admin: dict, test_user_admin: User
):
    r = await client.delete(
        f"/api/admin/utilisateurs/{test_user_admin.id}", headers=auth_headers_admin
    )
    assert r.status_code == 403
    detail = r.json()["detail"].lower()
    assert "lui-même" in detail or "soi-même" in detail


@pytest.mark.asyncio
async def test_reinit_password_genere_nouveau_token(
    client: AsyncClient, auth_headers_admin: dict, test_user_prof: User, db_session: AsyncSession
):
    """Reinit password : efface le hash et émet un nouveau token d'activation."""
    r = await client.post(
        f"/api/admin/utilisateurs/{test_user_prof.id}/reinit-password",
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["est_active"] is False
    assert isinstance(data["activation_token"], str)
    assert "?token=" in data["activation_url"]

    # Confirme côté DB : password_hash effacé
    await db_session.refresh(test_user_prof)
    assert test_user_prof.password_hash is None


@pytest.mark.asyncio
async def test_reinit_password_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/admin/utilisateurs/99999/reinit-password",
        headers=auth_headers_admin,
    )
    assert r.status_code == 404
