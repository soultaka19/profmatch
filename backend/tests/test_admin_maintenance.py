"""Tests du router admin-maintenance — POST /api/admin/maintenance/seed-demo.

Le seed réel (scripts idempotents + backfill) est mocké : on valide ici le
contrat de l'endpoint (rôle admin requis, forme de la réponse), pas la logique
de seed elle-même.
"""

from app.services.seed_demo_service import SeedDemoReport

SEED_PATH = "/api/admin/maintenance/seed-demo"

_FAKE_REPORT = SeedDemoReport(
    utilisateurs=14,
    professeurs=12,
    cours=10,
    sessions=1,
    embeddings_professeurs=12,
    embeddings_cours=10,
)


async def test_seed_demo_admin_charge_le_jeu(client, auth_headers_admin, monkeypatch):
    async def fake_seed(db):
        return _FAKE_REPORT

    monkeypatch.setattr("app.routers.admin_maintenance.seed_jeu_demo", fake_seed)

    resp = await client.post(SEED_PATH, headers=auth_headers_admin)

    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "utilisateurs": 14,
        "professeurs": 12,
        "cours": 10,
        "sessions": 1,
        "embeddings_professeurs": 12,
        "embeddings_cours": 10,
    }


async def test_seed_demo_interdit_aux_non_admins(client, auth_headers_rh, monkeypatch):
    async def fake_seed(db):  # ne doit jamais être atteint
        raise AssertionError("le seed ne doit pas s'exécuter pour un non-admin")

    monkeypatch.setattr("app.routers.admin_maintenance.seed_jeu_demo", fake_seed)

    resp = await client.post(SEED_PATH, headers=auth_headers_rh)

    assert resp.status_code == 403


async def test_seed_demo_exige_authentification(client):
    resp = await client.post(SEED_PATH)
    assert resp.status_code == 401
