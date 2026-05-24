"""Tests endpoints /api/programmes (PUT, DELETE et la suite du CRUD)."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme
from app.models.session import Semestre


@pytest.mark.asyncio
async def test_update_programme_admin_met_a_jour_nom(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="Programmation informatique", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)

    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "Programmation et développement"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom"] == "Programmation et développement"
    assert data["code"] == "51046"  # code immuable
    assert data["departement"] == "TI"  # champ non touché


@pytest.mark.asyncio
async def test_update_programme_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/programmes/999",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_programme_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "X"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_delete_programme_supprime_avec_cascade(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    e = EtapeProgramme(programme_id=p.id, ordre=1, nom="Étape 1")
    db_session.add(e)
    await db_session.commit()

    r = await client.delete(f"/api/programmes/{p.id}", headers=auth_headers_admin)
    assert r.status_code == 204

    found = await db_session.execute(select(Programme).where(Programme.id == p.id))
    assert found.scalar_one_or_none() is None
    etapes = await db_session.execute(
        select(EtapeProgramme).where(EtapeProgramme.programme_id == p.id)
    )
    assert etapes.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_programme_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/programmes/999", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_programme_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.delete(f"/api/programmes/{p.id}", headers=auth_headers_rh)
    assert r.status_code == 403


# ── semestres_admission ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_programme_avec_semestres(
    client: AsyncClient, auth_headers_admin: dict
):
    r = await client.post(
        "/api/programmes/",
        json={
            "code": "51046",
            "nom": "Programmation",
            "departement": "TI",
            "semestres_admission": ["automne", "hiver", "printemps"],
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert set(data["semestres_admission"]) == {"automne", "hiver", "printemps"}


@pytest.mark.asyncio
async def test_create_programme_semestres_par_defaut_automne(
    client: AsyncClient, auth_headers_admin: dict
):
    r = await client.post(
        "/api/programmes/",
        json={"code": "51046", "nom": "Programmation", "departement": None},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["semestres_admission"] == ["automne"]


@pytest.mark.asyncio
async def test_update_programme_change_semestres(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(
        code="51046", nom="P", departement=None,
        semestres_admission=[Semestre.AUTOMNE],
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"semestres_admission": ["automne", "hiver"]},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert set(r.json()["semestres_admission"]) == {"automne", "hiver"}


@pytest.mark.asyncio
async def test_create_programme_semestre_invalide_refuse(
    client: AsyncClient, auth_headers_admin: dict
):
    r = await client.post(
        "/api/programmes/",
        json={
            "code": "51046",
            "nom": "P",
            "departement": None,
            "semestres_admission": ["fall_2026"],
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 422
