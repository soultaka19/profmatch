"""Backfill des embeddings W4 pour les données historiques.

Les profs/cours créés avant le déploiement du score sémantique W4 ont leur
colonne `embedding` à NULL. Sans backfill, le score W4 reste à 0 pour ces
entités, même quand le pipeline normal (extraction CV / création de cours)
calcule désormais l'embedding au moment de l'insertion.

Le calcul d'embedding (sentence-transformers) est CPU-bloquant : on déporte
chaque encodage via `asyncio.to_thread` pour ne pas bloquer l'event loop.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.services.embeddings import (
    build_cours_text,
    build_professeur_text,
    compute_embedding,
)


async def backfill_embeddings_professeurs(db: AsyncSession) -> int:
    """Calcule l'embedding manquant pour chaque prof avec CV traité.

    Retourne le nombre de profs effectivement backfillés.
    """
    profs = (
        (
            await db.execute(
                select(Professeur)
                .join(CV, CV.professeur_id == Professeur.id)
                .where(CV.statut == CVStatut.TRAITE, Professeur.embedding.is_(None))
                .options(
                    selectinload(Professeur.competences),
                    selectinload(Professeur.experiences),
                )
            )
        )
        .scalars()
        .all()
    )

    n = 0
    for prof in profs:
        texte = build_professeur_text(
            prof.resume_profil,
            [c.nom for c in prof.competences],
            [
                " ".join(filter(None, (e.poste, e.employeur, e.description_courte)))
                for e in prof.experiences
            ],
        )
        prof.embedding = await asyncio.to_thread(compute_embedding, texte)
        n += 1
    if n:
        await db.commit()
    return n


async def backfill_embeddings_cours(db: AsyncSession) -> int:
    """Calcule l'embedding manquant pour chaque cours sans embedding.

    Retourne le nombre de cours effectivement backfillés.
    """
    cours_list = (await db.execute(select(Cours).where(Cours.embedding.is_(None)))).scalars().all()

    n = 0
    for cours in cours_list:
        texte = build_cours_text(cours.nom, cours.description)
        cours.embedding = await asyncio.to_thread(compute_embedding, texte)
        n += 1
    if n:
        await db.commit()
    return n
