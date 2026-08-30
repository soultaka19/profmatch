import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue, LangueNiveau
from app.models.professeur import Professeur
from app.models.user import User, UserRole

# ════════════════════════════════════════════════════════════════
# GET /cv/me/extraction
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_get_extraction_returns_empty_for_new_prof(
    client: AsyncClient, auth_headers_prof, professeur_prof: Professeur
):
    r = await client.get("/api/cv/me/extraction", headers=auth_headers_prof)
    assert r.status_code == 200
    data = r.json()
    assert data["profil"]["resume"] is None
    assert data["profil"]["source"] == "llm"
    assert data["competences"] == []
    assert data["experiences"] == []
    assert data["formations"] == []
    assert data["langues"] == []


@pytest.mark.asyncio
async def test_get_extraction_returns_persisted_data(
    client: AsyncClient,
    auth_headers_prof,
    professeur_prof: Professeur,
    db_session: AsyncSession,
):
    professeur_prof.resume_profil = "Dev senior"
    professeur_prof.resume_profil_source = SourceOrigine.MANUAL
    db_session.add_all(
        [
            Competence(
                professeur_id=professeur_prof.id,
                nom="Python",
                niveau=CompetenceNiveau.EXPERT,
                source=SourceOrigine.LLM,
            ),
            Experience(
                professeur_id=professeur_prof.id,
                poste="Dev",
                employeur="Acme",
                annee_debut=2020,
                source=SourceOrigine.LLM,
            ),
            Formation(
                professeur_id=professeur_prof.id,
                diplome="Bach",
                etablissement="UL",
                annee=2017,
                source=SourceOrigine.LLM,
            ),
            Langue(
                professeur_id=professeur_prof.id,
                langue="Français",
                niveau=LangueNiveau.NATIF,
                source=SourceOrigine.MANUAL,
            ),
        ]
    )
    await db_session.commit()

    r = await client.get("/api/cv/me/extraction", headers=auth_headers_prof)
    assert r.status_code == 200
    data = r.json()
    assert data["profil"]["resume"] == "Dev senior"
    assert data["profil"]["source"] == "manual"
    assert len(data["competences"]) == 1
    assert data["competences"][0]["nom"] == "Python"
    assert len(data["langues"]) == 1


@pytest.mark.asyncio
async def test_get_extraction_requires_auth(client: AsyncClient):
    r = await client.get("/api/cv/me/extraction")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_extraction_forbidden_for_rh(client: AsyncClient, auth_headers_rh):
    r = await client.get("/api/cv/me/extraction", headers=auth_headers_rh)
    assert r.status_code == 403


# ════════════════════════════════════════════════════════════════
# PATCH /cv/me/profil
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_patch_profil_sets_resume_and_marks_manual(
    client,
    auth_headers_prof,
    professeur_prof: Professeur,
    db_session: AsyncSession,
):
    r = await client.patch(
        "/api/cv/me/profil",
        json={"resume": "Nouveau résumé"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["resume"] == "Nouveau résumé"
    assert data["source"] == "manual"

    await db_session.refresh(professeur_prof)
    assert professeur_prof.resume_profil == "Nouveau résumé"
    assert professeur_prof.resume_profil_source == SourceOrigine.MANUAL


@pytest.mark.asyncio
async def test_patch_profil_null_clears_resume(client, auth_headers_prof, professeur_prof):
    r = await client.patch("/api/cv/me/profil", json={"resume": None}, headers=auth_headers_prof)
    assert r.status_code == 200
    data = r.json()
    assert data["resume"] is None
    assert data["source"] == "manual"


@pytest.mark.asyncio
async def test_patch_profil_max_length(client, auth_headers_prof):
    r = await client.patch(
        "/api/cv/me/profil",
        json={"resume": "x" * 1001},
        headers=auth_headers_prof,
    )
    assert r.status_code == 422


# ════════════════════════════════════════════════════════════════
# CRUD competences
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_post_competence_creates_manual_entry(client, auth_headers_prof, professeur_prof):
    r = await client.post(
        "/api/cv/me/competences",
        json={"nom": "Rust", "niveau": "intermediaire"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["nom"] == "Rust"
    assert data["source"] == "manual"
    assert "id" in data


@pytest.mark.asyncio
async def test_patch_competence_updates_and_forces_manual(
    client, auth_headers_prof, professeur_prof, db_session
):
    c = Competence(
        professeur_id=professeur_prof.id,
        nom="Python",
        niveau=CompetenceNiveau.AVANCE,
        source=SourceOrigine.LLM,
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)

    r = await client.patch(
        f"/api/cv/me/competences/{c.id}",
        json={"niveau": "expert"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["niveau"] == "expert"
    assert data["source"] == "manual"


@pytest.mark.asyncio
async def test_delete_competence(client, auth_headers_prof, professeur_prof, db_session):
    c = Competence(
        professeur_id=professeur_prof.id,
        nom="Java",
        niveau=CompetenceNiveau.DEBUTANT,
        source=SourceOrigine.LLM,
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)

    r = await client.delete(f"/api/cv/me/competences/{c.id}", headers=auth_headers_prof)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_patch_competence_404_if_not_owned(client, auth_headers_prof, db_session):
    # Compétence d'un autre prof
    other_user = User(
        email="other@x.ca",
        password_hash=hash_password("X"),
        role=UserRole.PROF,
        nom_complet="Other",
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)
    result = await db_session.execute(select(Professeur).where(Professeur.user_id == other_user.id))
    other_prof = result.scalar_one()
    c = Competence(
        professeur_id=other_prof.id,
        nom="X",
        niveau=CompetenceNiveau.AVANCE,
        source=SourceOrigine.LLM,
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)

    r = await client.patch(
        f"/api/cv/me/competences/{c.id}",
        json={"niveau": "expert"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 404


# ════════════════════════════════════════════════════════════════
# CRUD experiences (pattern symétrique)
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_post_experience(client, auth_headers_prof, professeur_prof):
    r = await client.post(
        "/api/cv/me/experiences",
        json={
            "poste": "Dev",
            "employeur": "X",
            "annee_debut": 2020,
            "annee_fin": None,
            "description_courte": "test",
        },
        headers=auth_headers_prof,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["poste"] == "Dev"
    assert data["annee_fin"] is None
    assert data["source"] == "manual"
    assert data["ordre"] == 0


@pytest.mark.asyncio
async def test_post_experience_auto_increments_ordre(
    client, auth_headers_prof, professeur_prof, db_session
):
    db_session.add(
        Experience(
            professeur_id=professeur_prof.id,
            poste="Old",
            employeur="Y",
            annee_debut=2018,
            source=SourceOrigine.LLM,
            ordre=0,
        )
    )
    await db_session.commit()

    r = await client.post(
        "/api/cv/me/experiences",
        json={
            "poste": "New",
            "employeur": "X",
            "annee_debut": 2021,
            "annee_fin": None,
            "description_courte": None,
        },
        headers=auth_headers_prof,
    )
    assert r.status_code == 201
    assert r.json()["ordre"] == 1


@pytest.mark.asyncio
async def test_patch_experience(client, auth_headers_prof, professeur_prof, db_session):
    exp = Experience(
        professeur_id=professeur_prof.id,
        poste="Dev",
        employeur="X",
        annee_debut=2020,
        source=SourceOrigine.LLM,
    )
    db_session.add(exp)
    await db_session.commit()
    await db_session.refresh(exp)

    r = await client.patch(
        f"/api/cv/me/experiences/{exp.id}",
        json={"poste": "Senior Dev"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 200
    assert r.json()["poste"] == "Senior Dev"
    assert r.json()["source"] == "manual"


@pytest.mark.asyncio
async def test_delete_experience(client, auth_headers_prof, professeur_prof, db_session):
    exp = Experience(
        professeur_id=professeur_prof.id,
        poste="Dev",
        employeur="X",
        annee_debut=2020,
        source=SourceOrigine.LLM,
    )
    db_session.add(exp)
    await db_session.commit()
    await db_session.refresh(exp)

    r = await client.delete(f"/api/cv/me/experiences/{exp.id}", headers=auth_headers_prof)
    assert r.status_code == 204


# ════════════════════════════════════════════════════════════════
# CRUD formations
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_post_formation(client, auth_headers_prof, professeur_prof):
    r = await client.post(
        "/api/cv/me/formations",
        json={"diplome": "Bach", "etablissement": "UL", "annee": 2018},
        headers=auth_headers_prof,
    )
    assert r.status_code == 201
    assert r.json()["source"] == "manual"


@pytest.mark.asyncio
async def test_patch_formation(client, auth_headers_prof, professeur_prof, db_session):
    f = Formation(
        professeur_id=professeur_prof.id,
        diplome="Bach",
        etablissement="UL",
        annee=2018,
        source=SourceOrigine.LLM,
    )
    db_session.add(f)
    await db_session.commit()
    await db_session.refresh(f)

    r = await client.patch(
        f"/api/cv/me/formations/{f.id}",
        json={"annee": 2019},
        headers=auth_headers_prof,
    )
    assert r.status_code == 200
    assert r.json()["annee"] == 2019


@pytest.mark.asyncio
async def test_delete_formation(client, auth_headers_prof, professeur_prof, db_session):
    f = Formation(
        professeur_id=professeur_prof.id,
        diplome="Bach",
        etablissement="UL",
        annee=2018,
        source=SourceOrigine.LLM,
    )
    db_session.add(f)
    await db_session.commit()
    await db_session.refresh(f)

    r = await client.delete(f"/api/cv/me/formations/{f.id}", headers=auth_headers_prof)
    assert r.status_code == 204


# ════════════════════════════════════════════════════════════════
# CRUD langues
# ════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_post_langue(client, auth_headers_prof, professeur_prof):
    r = await client.post(
        "/api/cv/me/langues",
        json={"langue": "Espagnol", "niveau": "B1"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 201
    assert r.json()["source"] == "manual"


@pytest.mark.asyncio
async def test_patch_langue(client, auth_headers_prof, professeur_prof, db_session):
    langue = Langue(
        professeur_id=professeur_prof.id,
        langue="Espagnol",
        niveau=LangueNiveau.B1,
        source=SourceOrigine.LLM,
    )
    db_session.add(langue)
    await db_session.commit()
    await db_session.refresh(langue)

    r = await client.patch(
        f"/api/cv/me/langues/{langue.id}",
        json={"niveau": "B2"},
        headers=auth_headers_prof,
    )
    assert r.status_code == 200
    assert r.json()["niveau"] == "B2"


@pytest.mark.asyncio
async def test_delete_langue(client, auth_headers_prof, professeur_prof, db_session):
    langue = Langue(
        professeur_id=professeur_prof.id,
        langue="Espagnol",
        niveau=LangueNiveau.B1,
        source=SourceOrigine.LLM,
    )
    db_session.add(langue)
    await db_session.commit()
    await db_session.refresh(langue)

    r = await client.delete(f"/api/cv/me/langues/{langue.id}", headers=auth_headers_prof)
    assert r.status_code == 204
