"""Tests endpoints /api/cours (CRUD complet admin + lecture rh)."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _make_cours(db_session: AsyncSession, code: str, nom: str) -> Cours:
    c = Cours(code=code, nom=nom, credits=3, heures=45)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c


# ── GET list ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_cours_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "INF2001", "Algorithmes")
    r = await client.get("/api/cours", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    codes = sorted(c["code"] for c in data)
    assert codes == ["INF1001", "INF2001"]


@pytest.mark.asyncio
async def test_list_cours_rh(client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro")
    r = await client.get("/api/cours", headers=auth_headers_rh)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_list_cours_refuse_prof(client: AsyncClient, auth_headers_prof: dict):
    r = await client.get("/api/cours", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_cours_recherche(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "MAT2001", "Calcul")
    r = await client.get("/api/cours?q=programmation", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "INF1001"


# ── Embedding W4 ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_cours_persists_embedding(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    """À la création, l'embedding W4 du cours est calculé (sinon W4 = 0)."""
    r = await client.post(
        "/api/cours",
        json={"code": "EMB-1", "nom": "Algorithmes", "description": "Tri et complexité"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    cours = (await db_session.execute(select(Cours).where(Cours.code == "EMB-1"))).scalar_one()
    await db_session.refresh(cours)
    assert cours.embedding is not None
    assert len(cours.embedding) > 0


@pytest.mark.asyncio
async def test_update_cours_recompute_embedding(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    """Modifier nom/description recalcule l'embedding W4."""
    cours = await _make_cours(db_session, "EMB-2", "Ancien intitulé")
    assert cours.embedding is None

    r = await client.put(
        f"/api/cours/{cours.id}",
        json={"nom": "Architecture logicielle", "description": "Patterns et SOLID"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    await db_session.refresh(cours)
    assert cours.embedding is not None
    assert len(cours.embedding) > 0


# ── POST create ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_cours_admin(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/cours",
        json={
            "code": "INF1001",
            "nom": "Intro programmation",
            "description": "Cours d'introduction",
            "credits": 3,
            "heures": 45,
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["code"] == "INF1001"
    assert data["nom"] == "Intro programmation"
    assert data["credits"] == 3
    assert data["heures"] == 45


@pytest.mark.asyncio
async def test_create_cours_code_doublon(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    await _make_cours(db_session, "INF1001", "Existant")
    r = await client.post(
        "/api/cours",
        json={"code": "INF1001", "nom": "Doublon"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_cours_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/cours",
        json={"code": "INF1001", "nom": "X"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


# ── GET one ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_cours_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session, "INF1001", "Intro")
    r = await client.get(f"/api/cours/{c.id}", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["id"] == c.id


@pytest.mark.asyncio
async def test_get_cours_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/cours/999", headers=auth_headers_admin)
    assert r.status_code == 404


# ── PUT update ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_cours_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session, "INF1001", "Intro")
    r = await client.put(
        f"/api/cours/{c.id}",
        json={"nom": "Intro révisée", "credits": 4},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom"] == "Intro révisée"
    assert data["credits"] == 4
    assert data["code"] == "INF1001"  # code immuable
    assert data["heures"] == 45  # non touché


@pytest.mark.asyncio
async def test_update_cours_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put("/api/cours/999", json={"nom": "X"}, headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_cours_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session, "INF1001", "Intro")
    r = await client.put(f"/api/cours/{c.id}", json={"nom": "X"}, headers=auth_headers_rh)
    assert r.status_code == 403


# ── DELETE ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_cours_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session, "INF1001", "Intro")
    cid = c.id
    r = await client.delete(f"/api/cours/{cid}", headers=auth_headers_admin)
    assert r.status_code == 204
    found = await db_session.execute(select(Cours).where(Cours.id == cid))
    assert found.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_cours_cascade_cursus(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    """La suppression d'un cours retire aussi ses rattachements aux cursus."""
    c = await _make_cours(db_session, "INF1001", "Intro")
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    e = EtapeProgramme(programme_id=p.id, ordre=1)
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=p.id,
            etape_id=e.id,
            cours_id=c.id,
            categorie=CategorieCours.OBLIGATOIRE,
        )
    )
    await db_session.commit()

    r = await client.delete(f"/api/cours/{c.id}", headers=auth_headers_admin)
    assert r.status_code == 204
    liens = await db_session.execute(
        select(CoursEtapeProgramme).where(CoursEtapeProgramme.cours_id == c.id)
    )
    assert liens.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_cours_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/cours/999", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_cours_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    c = await _make_cours(db_session, "INF1001", "Intro")
    r = await client.delete(f"/api/cours/{c.id}", headers=auth_headers_rh)
    assert r.status_code == 403
