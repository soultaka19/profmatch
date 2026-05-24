"""Tests endpoints /api/sessions et /api/sessions/{id}/ponderations."""

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Semestre, Session, SessionStatut
from app.models.user import User


@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient, test_user_admin: User, auth_headers_admin: dict):
    r = await client.get("/api/sessions/", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_create_session_admin(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/sessions/",
        json={"annee": 2026, "semestre": "automne"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["annee"] == 2026
    assert data["semestre"] == "automne"
    assert data["statut"] == "planifiee"
    assert data["nom"] == "Automne 2026"


@pytest.mark.asyncio
async def test_create_session_doublon(client: AsyncClient, auth_headers_admin: dict):
    payload = {"annee": 2026, "semestre": "automne"}
    await client.post("/api/sessions/", json=payload, headers=auth_headers_admin)
    r = await client.post("/api/sessions/", json=payload, headers=auth_headers_admin)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_session_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/sessions/",
        json={"annee": 2026, "semestre": "hiver"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_ponderations_par_defaut(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.get(f"/api/sessions/{sess.id}/ponderations", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert float(data["w1"]) == pytest.approx(0.4)
    assert data["xai_actif"] is True


@pytest.mark.asyncio
async def test_update_ponderations(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2027, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}/ponderations",
        json={"w1": "0.500", "w2": "0.300", "w3": "0.100", "w4": "0.100"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert float(r.json()["w1"]) == pytest.approx(0.5)


@pytest.mark.asyncio
async def test_update_ponderations_invalides(client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict):
    sess = Session(annee=2028, semestre=Semestre.ETE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}/ponderations",
        json={"w1": "0.5", "w2": "0.5", "w3": "0.5", "w4": "0.5"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_list_programmes(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/programmes/", headers=auth_headers_admin)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_create_programme(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/programmes/",
        json={"code": "51046", "nom": "Programmation informatique", "departement": "Informatique"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["code"] == "51046"


# ── PUT /sessions/{id} (changement statut) ───────────────────────────────────

@pytest.mark.asyncio
async def test_update_session_statut_admin(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}",
        json={"statut": "ouverte"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert r.json()["statut"] == "ouverte"


@pytest.mark.asyncio
async def test_update_session_statut_refuse_rh(
    client: AsyncClient, db_session: AsyncSession, auth_headers_rh: dict
):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}",
        json={"statut": "ouverte"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_update_session_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/sessions/999",
        json={"statut": "ouverte"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_session_statut_invalide(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}",
        json={"statut": "n'importe_quoi"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 422


# ── DELETE /sessions/{id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_session_admin(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
    sess = Session(annee=2026, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    session_id = sess.id

    r = await client.delete(f"/api/sessions/{session_id}", headers=auth_headers_admin)
    assert r.status_code == 204

    # vérifier que la session ET ses pondérations ont disparu (cascade)
    r2 = await client.get(f"/api/sessions/{session_id}", headers=auth_headers_admin)
    assert r2.status_code == 404
    r3 = await client.get(f"/api/sessions/{session_id}/ponderations", headers=auth_headers_admin)
    assert r3.status_code == 404


@pytest.mark.asyncio
async def test_delete_session_refuse_rh(
    client: AsyncClient, db_session: AsyncSession, auth_headers_rh: dict
):
    sess = Session(annee=2026, semestre=Semestre.HIVER)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    r = await client.delete(f"/api/sessions/{sess.id}", headers=auth_headers_rh)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_delete_session_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/sessions/999", headers=auth_headers_admin)
    assert r.status_code == 404


# ── GET /sessions/{id}/programmes-eligibles ──────────────────────────────────

@pytest.mark.asyncio
async def test_programmes_eligibles_session_automne(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
    """Session Automne — tous les programmes (STANDARD et CONTINU) sont éligibles."""
    from app.models.programme import Programme

    p_std = Programme(
        code="51046", nom="Standard", departement=None,
        semestres_admission=[Semestre.AUTOMNE],
    )
    p_cont = Programme(
        code="51047", nom="Continu", departement=None,
        semestres_admission=[Semestre.AUTOMNE, Semestre.HIVER, Semestre.PRINTEMPS],
    )
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add_all([p_std, p_cont, sess])
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.get(
        f"/api/sessions/{sess.id}/programmes-eligibles", headers=auth_headers_admin
    )
    assert r.status_code == 200
    codes = {p["code"] for p in r.json()}
    assert codes == {"51046", "51047"}


@pytest.mark.asyncio
async def test_programmes_eligibles_session_printemps_filtre_standards(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
    """Session Printemps — seuls les programmes CONTINU sont éligibles."""
    from app.models.programme import Programme

    p_std = Programme(
        code="51046", nom="Standard", departement=None,
        semestres_admission=[Semestre.AUTOMNE],
    )
    p_cont = Programme(
        code="51047", nom="Continu", departement=None,
        semestres_admission=[Semestre.AUTOMNE, Semestre.PRINTEMPS],
    )
    sess = Session(annee=2026, semestre=Semestre.PRINTEMPS)
    db_session.add_all([p_std, p_cont, sess])
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.get(
        f"/api/sessions/{sess.id}/programmes-eligibles", headers=auth_headers_admin
    )
    assert r.status_code == 200
    codes = {p["code"] for p in r.json()}
    assert codes == {"51047"}


@pytest.mark.asyncio
async def test_programmes_eligibles_404(
    client: AsyncClient, auth_headers_admin: dict
):
    r = await client.get(
        "/api/sessions/999/programmes-eligibles", headers=auth_headers_admin
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_programmes_eligibles_rh_autorise(
    client: AsyncClient, db_session: AsyncSession, auth_headers_rh: dict
):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    r = await client.get(
        f"/api/sessions/{sess.id}/programmes-eligibles", headers=auth_headers_rh
    )
    assert r.status_code == 200
