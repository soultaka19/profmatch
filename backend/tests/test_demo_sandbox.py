"""Tests du bac à sable de démonstration.

Ce que ces tests verrouillent : ProfMatch n'a **aucun** cloisonnement par
organisation, et le bac à sable en pose un partiel — comptes et sessions. Un
oubli de portée n'y produit aucune erreur, juste une fuite silencieuse : un
visiteur qui voit le professeur d'un autre visiteur voit son CV.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.demo_sandbox import DemoSandbox
from app.models.professeur import Professeur
from app.models.session import Semestre, Session, SessionStatut
from app.models.user import User, UserRole
from app.services.demo_service import purger_expires


async def _creer(client: AsyncClient, ip: str = "203.0.113.7") -> dict:
    """Crée un bac à sable comme le ferait un visiteur derrière Vercel.

    L'en-tête est celui qui traverse Caddy intact : c'est le seul que la limite
    par adresse IP peut lire (voir app/core/client_ip.py).
    """
    r = await client.post("/api/demo/sandbox", headers={"X-Vercel-Forwarded-For": ip})
    assert r.status_code == 201, r.text
    return r.json()


def _entete(bac: dict, role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {bac['jetons'][role]}"}


@pytest.mark.asyncio
async def test_creation_sans_compte_rend_les_trois_roles(client: AsyncClient):
    bac = await _creer(client)

    assert set(bac["jetons"]) == {"prof", "rh", "admin"}
    assert bac["appels_ia_restants"] == settings.DEMO_APPELS_IA
    # La session du visiteur lui appartient : il peut la piloter sans toucher
    # à celle de l'établissement.
    assert bac["session_id"] > 0
    assert datetime.fromisoformat(bac["expire_le"]) > datetime.now(UTC)


@pytest.mark.asyncio
async def test_statut_repond_pour_un_compte_reel(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/demo/status", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["est_demo"] is False


@pytest.mark.asyncio
async def test_limite_de_creation_par_adresse(client: AsyncClient):
    for _ in range(settings.DEMO_LIMITE_CREATIONS):
        await _creer(client, "198.51.100.4")

    refus = await client.post(
        "/api/demo/sandbox", headers={"X-Vercel-Forwarded-For": "198.51.100.4"}
    )
    assert refus.status_code == 429

    # Une autre adresse n'est pas pénalisée.
    autre = await client.post(
        "/api/demo/sandbox", headers={"X-Vercel-Forwarded-For": "198.51.100.5"}
    )
    assert autre.status_code == 201


@pytest.mark.asyncio
async def test_un_visiteur_ne_voit_pas_le_professeur_d_un_autre(
    client: AsyncClient, db_session: AsyncSession
):
    a = await _creer(client, "203.0.113.10")
    b = await _creer(client, "203.0.113.11")

    # Le professeur de chaque bac existe (créé par l'événement after_insert).
    profs_b = (
        (
            await db_session.execute(
                select(Professeur)
                .join(User, Professeur.user_id == User.id)
                .where(User.sandbox_id == b["sandbox_id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(profs_b) == 1

    liste = await client.get("/api/rh/professeurs", headers=_entete(a, "rh"))
    assert liste.status_code == 200
    vus = {item["professeur_id"] for item in liste.json()["items"]}
    assert profs_b[0].id not in vus

    detail = await client.get(f"/api/rh/professeurs/{profs_b[0].id}", headers=_entete(a, "rh"))
    assert detail.status_code == 404


@pytest.mark.asyncio
async def test_un_visiteur_voit_les_professeurs_de_l_etablissement(
    client: AsyncClient, test_user_prof: User
):
    """Sinon la génération d'affectations n'aurait aucun candidat."""
    bac = await _creer(client)

    liste = await client.get("/api/rh/professeurs", headers=_entete(bac, "rh"))
    assert liste.status_code == 200
    emails = {item["email"] for item in liste.json()["items"]}
    assert test_user_prof.email in emails


@pytest.mark.asyncio
async def test_un_visiteur_ne_voit_pas_les_comptes_d_un_autre(client: AsyncClient):
    a = await _creer(client, "203.0.113.20")
    b = await _creer(client, "203.0.113.21")

    vus_par_a = {
        u["email"]
        for u in (await client.get("/api/admin/utilisateurs", headers=_entete(a, "admin"))).json()
    }
    vus_par_b = {
        u["email"]
        for u in (await client.get("/api/admin/utilisateurs", headers=_entete(b, "admin"))).json()
    }

    # Chacun voit ses 3 comptes jetables, aucun de ceux de l'autre.
    demo_a = {e for e in vus_par_a if e.endswith("@demo.profmatch")}
    demo_b = {e for e in vus_par_b if e.endswith("@demo.profmatch")}
    assert len(demo_a) == 3
    assert len(demo_b) == 3
    assert demo_a.isdisjoint(demo_b)


@pytest.mark.asyncio
async def test_un_visiteur_ne_touche_pas_a_la_session_de_l_etablissement(
    client: AsyncClient, db_session: AsyncSession
):
    reelle = Session(annee=2026, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
    db_session.add(reelle)
    await db_session.commit()
    await db_session.refresh(reelle)

    bac = await _creer(client)
    admin = _entete(bac, "admin")

    # Il la voit — elle fait partie du produit qu'on lui montre…
    liste = await client.get("/api/sessions", headers=admin)
    assert reelle.id in {s["id"] for s in liste.json()}

    # …mais il ne peut ni la modifier, ni la supprimer, ni en changer les poids.
    poids = {"w1": 0.4, "w2": 0.3, "w3": 0.2, "w4": 0.1}
    assert (
        await client.put(f"/api/sessions/{reelle.id}", headers=admin, json={"statut": "fermee"})
    ).status_code == 404
    assert (await client.delete(f"/api/sessions/{reelle.id}", headers=admin)).status_code == 404
    assert (
        await client.put(f"/api/sessions/{reelle.id}/ponderations", headers=admin, json=poids)
    ).status_code == 404

    # Sur la sienne, en revanche, tout est permis.
    assert (
        await client.put(
            f"/api/sessions/{bac['session_id']}/ponderations", headers=admin, json=poids
        )
    ).status_code == 200


@pytest.mark.asyncio
async def test_un_visiteur_ne_genere_pas_dans_la_session_de_l_etablissement(
    client: AsyncClient, db_session: AsyncSession
):
    """Générer, c'est écrire : la portée d'écriture ne suit pas celle de lecture."""
    reelle = Session(annee=2027, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
    db_session.add(reelle)
    await db_session.commit()
    await db_session.refresh(reelle)

    bac = await _creer(client)
    with patch("app.routers.affectations.generer_affectations_task.delay") as tache:
        refus = await client.post(
            "/api/affectations/generer",
            headers=_entete(bac, "rh"),
            json={"session_id": reelle.id, "programme_ids": [1]},
        )
    assert refus.status_code == 404
    tache.assert_not_called()

    with patch("app.routers.affectations.generer_affectations_task.delay") as tache:
        tache.return_value.id = "tache-du-visiteur"
        accepte = await client.post(
            "/api/affectations/generer",
            headers=_entete(bac, "rh"),
            json={"session_id": bac["session_id"], "programme_ids": [1]},
        )
    assert accepte.status_code == 202
    tache.assert_called_once()


@pytest.mark.asyncio
async def test_le_referentiel_partage_est_en_lecture_seule(
    client: AsyncClient, db_session: AsyncSession
):
    db_session.add(Cours(code="INF1001", nom="Intro", credits=3, heures=45))
    await db_session.commit()

    bac = await _creer(client)
    admin = _entete(bac, "admin")

    assert (await client.get("/api/cours", headers=admin)).status_code == 200

    refus = await client.post(
        "/api/cours",
        headers=admin,
        json={"code": "INF9999", "nom": "Cours du visiteur", "credits": 3, "heures": 45},
    )
    assert refus.status_code == 403
    assert "lecture seule" in refus.json()["detail"]

    # Le jeu de démonstration ne se recharge pas non plus depuis un bac à sable.
    assert (await client.post("/api/admin/maintenance/seed-demo", headers=admin)).status_code == 403


@pytest.mark.asyncio
async def test_les_statistiques_sont_bornees_au_bac(
    client: AsyncClient, db_session: AsyncSession, test_user_admin: User
):
    a = await _creer(client, "203.0.113.30")
    await _creer(client, "203.0.113.31")

    stats = await client.get("/api/admin/stats", headers=_entete(a, "admin"))
    assert stats.status_code == 200

    reels = (
        await db_session.execute(
            select(func.count()).select_from(User).where(User.sandbox_id.is_(None))
        )
    ).scalar_one()
    # Comptes réels + les 3 du bac courant, jamais ceux de l'autre bac.
    assert stats.json()["utilisateurs_total"] == reels + 3


@pytest.mark.asyncio
async def test_le_budget_ia_se_decompte_et_se_refuse(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    monkeypatch.setattr("app.core.config.settings.DEMO_APPELS_IA", 2)
    from app.core.demo_scope import tenter_appel_ia

    bac = await _creer(client)
    compte = (
        await db_session.execute(
            select(User).where(User.sandbox_id == bac["sandbox_id"], User.role == UserRole.PROF)
        )
    ).scalar_one()

    assert await tenter_appel_ia(db_session, compte) is True
    assert await tenter_appel_ia(db_session, compte) is True
    # Le troisième est refusé, sans exception : l'appelant décide quoi en faire.
    assert await tenter_appel_ia(db_session, compte) is False

    statut = await client.get("/api/demo/status", headers=_entete(bac, "prof"))
    assert statut.json()["appels_ia_restants"] == 0


@pytest.mark.asyncio
async def test_le_plafond_quotidien_arrete_tous_les_bacs(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    monkeypatch.setattr("app.core.config.settings.DEMO_APPELS_IA_PAR_JOUR", 1)
    from app.core.demo_scope import tenter_appel_ia

    a = await _creer(client, "203.0.113.40")
    b = await _creer(client, "203.0.113.41")

    async def _compte_prof(bac: dict) -> User:
        return (
            await db_session.execute(
                select(User).where(User.sandbox_id == bac["sandbox_id"], User.role == UserRole.PROF)
            )
        ).scalar_one()

    assert await tenter_appel_ia(db_session, await _compte_prof(a)) is True
    # Le plafond ne dépend d'aucun en-tête : un autre bac est arrêté lui aussi.
    assert await tenter_appel_ia(db_session, await _compte_prof(b)) is False


@pytest.mark.asyncio
async def test_un_compte_reel_ne_consomme_aucun_budget(
    db_session: AsyncSession, test_user_prof: User
):
    from app.core.demo_scope import tenter_appel_ia

    for _ in range(settings.DEMO_APPELS_IA + 5):
        assert await tenter_appel_ia(db_session, test_user_prof) is True


@pytest.mark.asyncio
async def test_la_purge_efface_tout_ce_que_le_visiteur_a_laisse(
    client: AsyncClient, db_session: AsyncSession
):
    bac = await _creer(client)
    sandbox_id = bac["sandbox_id"]

    prof = (
        await db_session.execute(
            select(Professeur)
            .join(User, Professeur.user_id == User.id)
            .where(User.sandbox_id == sandbox_id)
        )
    ).scalar_one()
    db_session.add(
        CV(
            professeur_id=prof.id,
            nom_original="cv-du-visiteur.pdf",
            chemin_fichier="/uploads/cv-du-visiteur.pdf",
            taille_octets=1024,
            mime_type="application/pdf",
            statut=CVStatut.TRAITE,
            texte_brut="CV du visiteur",
        )
    )
    await db_session.commit()

    # On antidate l'expiration plutôt que d'attendre une heure.
    objet = await db_session.get(DemoSandbox, sandbox_id)
    objet.expire_le = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    assert await purger_expires(db_session) == 1

    for modele, condition in (
        (User, User.sandbox_id == sandbox_id),
        (Session, Session.sandbox_id == sandbox_id),
        (Professeur, Professeur.id == prof.id),
        (CV, CV.professeur_id == prof.id),
    ):
        reste = (
            await db_session.execute(select(func.count()).select_from(modele).where(condition))
        ).scalar_one()
        assert reste == 0, f"{modele.__name__} survit à la purge"


@pytest.mark.asyncio
async def test_la_purge_epargne_un_bac_encore_vivant(client: AsyncClient, db_session: AsyncSession):
    bac = await _creer(client)
    assert await purger_expires(db_session) == 0
    assert await db_session.get(DemoSandbox, bac["sandbox_id"]) is not None
