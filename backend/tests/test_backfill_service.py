"""Tests du service de backfill des embeddings W4.

Pour les données historiques (créées avant le déploiement W4), les colonnes
`Professeur.embedding` et `Cours.embedding` peuvent valoir NULL. Sans
backfill, le score sémantique W4 vaut 0 pour toujours sur ces profs/cours.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur

# ── Helpers ──────────────────────────────────────────────────────────────────


async def _make_prof_avec_cv(
    db: AsyncSession,
    email: str,
    nom: str,
    statut_cv: CVStatut,
    avec_embedding: bool,
) -> Professeur:
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    user = User(
        email=email,
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet=nom,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    prof = (await db.execute(select(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    prof.resume_profil = f"Profil de {nom}"
    if avec_embedding:
        prof.embedding = [0.1, 0.2, 0.3]
    db.add(
        CV(
            professeur_id=prof.id,
            nom_original="cv.pdf",
            chemin_fichier="x",
            taille_octets=1,
            mime_type="application/pdf",
            statut=statut_cv,
        )
    )
    await db.commit()
    await db.refresh(prof)
    return prof


# ── backfill_embeddings_professeurs ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_backfill_profs_traite_calcule_embedding(db_session: AsyncSession):
    """Un prof CV traité + embedding NULL reçoit un embedding non vide."""
    from app.services.backfill_service import backfill_embeddings_professeurs

    prof = await _make_prof_avec_cv(
        db_session, "p1@test.ca", "P1", CVStatut.TRAITE, avec_embedding=False
    )

    n = await backfill_embeddings_professeurs(db_session)

    await db_session.refresh(prof)
    assert n == 1
    assert prof.embedding is not None
    assert len(prof.embedding) > 0


@pytest.mark.asyncio
async def test_backfill_profs_ignore_cv_non_traite(db_session: AsyncSession):
    """Un prof dont le CV est EN_ATTENTE ne doit pas recevoir d'embedding."""
    from app.services.backfill_service import backfill_embeddings_professeurs

    prof = await _make_prof_avec_cv(
        db_session, "p2@test.ca", "P2", CVStatut.EN_ATTENTE, avec_embedding=False
    )

    n = await backfill_embeddings_professeurs(db_session)

    await db_session.refresh(prof)
    assert n == 0
    assert prof.embedding is None


@pytest.mark.asyncio
async def test_backfill_profs_ignore_si_deja_present(db_session: AsyncSession):
    """Un prof avec embedding déjà calculé n'est pas recalculé."""
    from app.services.backfill_service import backfill_embeddings_professeurs

    prof = await _make_prof_avec_cv(
        db_session, "p3@test.ca", "P3", CVStatut.TRAITE, avec_embedding=True
    )
    valeur_initiale = list(prof.embedding)

    n = await backfill_embeddings_professeurs(db_session)

    await db_session.refresh(prof)
    assert n == 0
    assert prof.embedding == valeur_initiale


# ── backfill_embeddings_cours ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_backfill_cours_sans_embedding(db_session: AsyncSession):
    from app.services.backfill_service import backfill_embeddings_cours

    cours = Cours(code="BF-001", nom="Cours backfill")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    assert cours.embedding is None

    n = await backfill_embeddings_cours(db_session)

    await db_session.refresh(cours)
    assert n == 1
    assert cours.embedding is not None
    assert len(cours.embedding) > 0


@pytest.mark.asyncio
async def test_backfill_cours_ignore_si_deja_present(db_session: AsyncSession):
    from app.services.backfill_service import backfill_embeddings_cours

    cours = Cours(code="BF-002", nom="Cours déjà", embedding=[0.4, 0.5, 0.6])
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    n = await backfill_embeddings_cours(db_session)

    await db_session.refresh(cours)
    assert n == 0
    assert cours.embedding == [0.4, 0.5, 0.6]


# ── Endpoint POST /api/admin/maintenance/backfill-embeddings ─────────────────


@pytest.mark.asyncio
async def test_backfill_endpoint_exige_admin(client, auth_headers_rh):
    """RH ne peut pas déclencher le backfill (réservé admin)."""
    resp = await client.post("/api/admin/maintenance/backfill-embeddings", headers=auth_headers_rh)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_backfill_endpoint_admin_renvoie_compteurs(
    db_session: AsyncSession, client, auth_headers_admin
):
    """Admin déclenche le backfill et reçoit le détail des comptes."""
    prof = await _make_prof_avec_cv(
        db_session, "endp@test.ca", "Endp", CVStatut.TRAITE, avec_embedding=False
    )
    cours = Cours(code="BF-END", nom="Cours endpoint")
    db_session.add(cours)
    await db_session.commit()

    resp = await client.post(
        "/api/admin/maintenance/backfill-embeddings", headers=auth_headers_admin
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["professeurs"] == 1
    assert body["cours"] == 1
    await db_session.refresh(prof)
    assert prof.embedding is not None
