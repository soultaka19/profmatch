import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.user import User, UserRole


async def _make_prof(db: AsyncSession, email: str, nom: str) -> Professeur:
    user = User(
        email=email, password_hash=hash_password("Test@1234"), role=UserRole.PROF, nom_complet=nom
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    result = await db.execute(select(Professeur).where(Professeur.user_id == user.id))
    return result.scalar_one()


# ── Liste ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_requires_auth(client: AsyncClient):
    r = await client.get("/api/rh/professeurs")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_forbidden_for_prof(client: AsyncClient, auth_headers_prof):
    r = await client.get("/api/rh/professeurs", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_returns_profs_with_cv_statut(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    db_session.add(
        CV(
            professeur_id=prof.id,
            nom_original="alice.pdf",
            chemin_fichier="/x/alice.pdf",
            taille_octets=100,
            mime_type="application/pdf",
            statut=CVStatut.TRAITE,
        )
    )
    await db_session.commit()

    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 10
    item = data["items"][0]
    assert item["professeur_id"] == prof.id
    assert item["nom_complet"] == "Alice Martin"
    assert item["email"] == "alice@test.ca"
    assert item["cv_statut"] == "traite"
    assert item["cv_nom_original"] == "alice.pdf"


@pytest.mark.asyncio
async def test_list_prof_without_cv_has_null_statut(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    await _make_prof(db_session, "bob@test.ca", "Bob Tremblay")
    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["cv_statut"] is None
    assert item["cv_nom_original"] is None


@pytest.mark.asyncio
async def test_list_excludes_non_prof_users(
    client: AsyncClient,
    auth_headers_rh,
    test_user_rh,
    db_session: AsyncSession,
):
    await _make_prof(db_session, "carol@test.ca", "Carol Roy")
    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nom_complet"] == "Carol Roy"


@pytest.mark.asyncio
async def test_list_search_filters_by_name_or_email(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    await _make_prof(db_session, "bob@test.ca", "Bob Tremblay")
    r = await client.get("/api/rh/professeurs?q=marti", headers=auth_headers_rh)
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nom_complet"] == "Alice Martin"


@pytest.mark.asyncio
async def test_list_pagination(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    for i in range(3):
        await _make_prof(db_session, f"p{i}@test.ca", f"Prof {i}")
    r = await client.get("/api/rh/professeurs?page=2&page_size=2", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 3
    assert data["page"] == 2
    assert data["page_size"] == 2
    assert len(data["items"]) == 1


# ── Détail ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_detail_forbidden_for_prof(client: AsyncClient, auth_headers_prof, db_session):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    r = await client.get(f"/api/rh/professeurs/{prof.id}", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_detail_404_for_unknown(client: AsyncClient, auth_headers_rh):
    r = await client.get("/api/rh/professeurs/999999", headers=auth_headers_rh)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_detail_returns_profile_for_prof_without_cv(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    # Prof fraîchement créé : pas de CV, pas de données extraites.
    prof = await _make_prof(db_session, "neo@test.ca", "Neo Sansfichier")

    r = await client.get(f"/api/rh/professeurs/{prof.id}", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["professeur_id"] == prof.id
    assert data["nom_complet"] == "Neo Sansfichier"
    assert data["cv_statut"] is None
    assert data["cv_nom_original"] is None
    assert data["profil"]["resume"] is None
    assert data["profil"]["source"] == "llm"
    assert data["competences"] == []
    assert data["experiences"] == []
    assert data["formations"] == []
    assert data["langues"] == []


@pytest.mark.asyncio
async def test_detail_returns_full_profile(
    client: AsyncClient,
    auth_headers_rh,
    db_session: AsyncSession,
):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    prof.resume_profil = "Dev senior"
    prof.resume_profil_source = SourceOrigine.LLM
    db_session.add(
        CV(
            professeur_id=prof.id,
            nom_original="alice.pdf",
            chemin_fichier="/x/alice.pdf",
            taille_octets=100,
            mime_type="application/pdf",
            statut=CVStatut.TRAITE,
        )
    )
    db_session.add(
        Competence(
            professeur_id=prof.id,
            nom="Python",
            niveau=CompetenceNiveau.EXPERT,
            source=SourceOrigine.LLM,
        )
    )
    await db_session.commit()

    r = await client.get(f"/api/rh/professeurs/{prof.id}", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["professeur_id"] == prof.id
    assert data["nom_complet"] == "Alice Martin"
    assert data["email"] == "alice@test.ca"
    assert data["cv_statut"] == "traite"
    assert data["profil"]["resume"] == "Dev senior"
    assert data["profil"]["source"] == "llm"
    assert len(data["competences"]) == 1
    assert data["competences"][0]["nom"] == "Python"
    assert data["experiences"] == []
    assert data["formations"] == []
    assert data["langues"] == []
