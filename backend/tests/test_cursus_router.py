"""Tests endpoints cursus : /api/programmes/{p}/etapes/{e}/cours."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _seed(db_session: AsyncSession) -> tuple[Programme, EtapeProgramme, Cours]:
    p = Programme(code="51046", nom="Programmation", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    e = EtapeProgramme(programme_id=p.id, ordre=1, nom="Étape 1")
    db_session.add(e)
    c = Cours(code="INF1001", nom="Intro", credits=3)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(e)
    await db_session.refresh(c)
    return p, e, c


@pytest.mark.asyncio
async def test_create_cursus_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id, "categorie": "obligatoire"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["cours_id"] == c.id
    assert data["categorie"] == "obligatoire"


@pytest.mark.asyncio
async def test_create_cursus_categorie_par_defaut(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["categorie"] == "obligatoire"


@pytest.mark.asyncio
async def test_create_cursus_doublon(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=p.id, etape_id=e.id, cours_id=c.id, categorie=CategorieCours.OBLIGATOIRE
        )
    )
    await db_session.commit()
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_cursus_etape_inconnue(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, _, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/999/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_cursus_cours_inconnu(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, _ = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": 999},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_cursus(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    p, e, c = await _seed(db_session)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=p.id, etape_id=e.id, cours_id=c.id, categorie=CategorieCours.OBLIGATOIRE
        )
    )
    await db_session.commit()
    r = await client.get(f"/api/programmes/{p.id}/etapes/{e.id}/cours", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["cours_id"] == c.id


@pytest.mark.asyncio
async def test_update_cursus_categorie(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id,
        etape_id=e.id,
        cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    r = await client.put(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lien.id}",
        json={"categorie": "choix_francais"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert r.json()["categorie"] == "choix_francais"


@pytest.mark.asyncio
async def test_delete_cursus(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    from sqlalchemy import select as _select

    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id,
        etape_id=e.id,
        cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    lid = lien.id
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lid}",
        headers=auth_headers_admin,
    )
    assert r.status_code == 204
    found = await db_session.execute(
        _select(CoursEtapeProgramme).where(CoursEtapeProgramme.id == lid)
    )
    assert found.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_cursus_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id,
        etape_id=e.id,
        cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lien.id}",
        headers=auth_headers_rh,
    )
    assert r.status_code == 403
