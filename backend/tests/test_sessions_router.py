"""Tests endpoints /api/sessions et /api/sessions/{id}/ponderations."""

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Semestre, Session, SessionStatut
from app.models.user import User


@pytest.mark.asyncio
async def test_list_sessions_empty(
    client: AsyncClient, test_user_admin: User, auth_headers_admin: dict
):
    r = await client.get("/api/sessions", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_create_session_admin(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/sessions",
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
    await client.post("/api/sessions", json=payload, headers=auth_headers_admin)
    r = await client.post("/api/sessions", json=payload, headers=auth_headers_admin)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_session_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/sessions",
        json={"annee": 2026, "semestre": "hiver"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_ponderations_par_defaut(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
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
async def test_update_ponderations(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
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
async def test_update_ponderations_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    sess = Session(annee=2029, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    r = await client.put(
        f"/api/sessions/{sess.id}/ponderations",
        json={"w1": 0.4, "w2": 0.3, "w3": 0.2, "w4": 0.1},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_update_ponderations_invalides(
    client: AsyncClient, db_session: AsyncSession, auth_headers_admin: dict
):
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
    r = await client.get("/api/programmes", headers=auth_headers_admin)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_create_programme(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/programmes",
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
        code="51046",
        nom="Standard",
        departement=None,
        semestres_admission=[Semestre.AUTOMNE],
    )
    p_cont = Programme(
        code="51047",
        nom="Continu",
        departement=None,
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
        code="51046",
        nom="Standard",
        departement=None,
        semestres_admission=[Semestre.AUTOMNE],
    )
    p_cont = Programme(
        code="51047",
        nom="Continu",
        departement=None,
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
async def test_programmes_eligibles_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/sessions/999/programmes-eligibles", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_programmes_eligibles_rh_autorise(
    client: AsyncClient, db_session: AsyncSession, auth_headers_rh: dict
):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    r = await client.get(f"/api/sessions/{sess.id}/programmes-eligibles", headers=auth_headers_rh)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_etapes_statut_marque_etape_complete(client, db_session, auth_headers_rh):
    from sqlalchemy import select as _sel

    from app.core.security import hash_password
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
    from app.models.cv import CV, CVStatut
    from app.models.etape_programme import EtapeProgramme
    from app.models.professeur import Professeur
    from app.models.programme import Programme
    from app.models.user import User, UserRole

    user = User(
        email="zp@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Z Prof",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    prof = (
        await db_session.execute(_sel(Professeur).where(Professeur.user_id == user.id))
    ).scalar_one()
    db_session.add(
        CV(
            professeur_id=prof.id,
            nom_original="cv.pdf",
            chemin_fichier="x",
            taille_octets=1,
            mime_type="application/pdf",
            statut=CVStatut.TRAITE,
        )
    )
    prog = Programme(code="ST-01", nom="Prog", semestres_admission=[Semestre.AUTOMNE])
    sess = Session(annee=2050, semestre=Semestre.AUTOMNE)
    db_session.add_all([prog, sess])
    await db_session.commit()
    await db_session.refresh(prog)
    await db_session.refresh(sess)
    etape = EtapeProgramme(programme_id=prog.id, ordre=1)
    cours = Cours(code="ST-C1", nom="C")
    db_session.add_all([etape, cours])
    await db_session.commit()
    await db_session.refresh(etape)
    await db_session.refresh(cours)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=prog.id,
            etape_id=etape.id,
            cours_id=cours.id,
            categorie=CategorieCours.OBLIGATOIRE,
        )
    )
    db_session.add(
        Affectation(
            session_id=sess.id,
            professeur_id=prof.id,
            cours_id=cours.id,
            score_total=Decimal("0.8"),
            score_comp=Decimal("0.8"),
            score_exp=Decimal("0.8"),
            score_hist=Decimal("0.8"),
            score_sem=Decimal("0.8"),
            statut=AffectationStatut.VALIDEE,
        )
    )
    await db_session.commit()

    resp = await client.get(
        f"/api/sessions/{sess.id}/programmes/{prog.id}/etapes-statut",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["ordre"] == 1
    assert body[0]["total_cours"] == 1
    assert body[0]["affectation_complete"] is True


@pytest.mark.asyncio
async def test_etapes_statut_session_introuvable(client, auth_headers_rh):
    resp = await client.get(
        "/api/sessions/999999/programmes/1/etapes-statut",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_etapes_statut_programme_introuvable(client, db_session, auth_headers_rh):
    sess = Session(annee=2052, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    resp = await client.get(
        f"/api/sessions/{sess.id}/programmes/999999/etapes-statut",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 404
