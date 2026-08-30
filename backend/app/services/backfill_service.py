"""Backfill des embeddings W4 pour les données historiques.

Les profs/cours créés avant le déploiement du score sémantique W4 ont leur
colonne `embedding` à NULL. Sans backfill, le score W4 reste à 0 pour ces
entités, même quand le pipeline normal (extraction CV / création de cours)
calcule désormais l'embedding au moment de l'insertion.

`force=True` recalcule aussi les embeddings **déjà présents**. C'est ce qu'exige
tout changement de modèle d'embedding : deux modèles produisent des espaces
vectoriels distincts, et comparer un vecteur de l'ancien à un vecteur du nouveau
ne donne pas une similarité fausse mais une similarité *dénuée de sens*. Sans
recalcul complet, W4 dégraderait silencieusement les affectations.

Chaque encodage est un appel réseau bloquant (client HTTP synchrone) : on le
déporte via `asyncio.to_thread` pour ne pas bloquer l'event loop.
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


async def backfill_embeddings_professeurs(db: AsyncSession, force: bool = False) -> int:
    """Calcule l'embedding manquant pour chaque prof avec CV traité.

    `force=True` recalcule également ceux qui en ont déjà un (changement de
    modèle d'embedding). Retourne le nombre de profs effectivement traités.
    """
    filtres = [CV.statut == CVStatut.TRAITE]
    if not force:
        filtres.append(Professeur.embedding.is_(None))

    profs = (
        (
            await db.execute(
                select(Professeur)
                .join(CV, CV.professeur_id == Professeur.id)
                .where(*filtres)
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


async def backfill_embeddings_cours(db: AsyncSession, force: bool = False) -> int:
    """Calcule l'embedding manquant pour chaque cours sans embedding.

    `force=True` recalcule également ceux qui en ont déjà un (changement de
    modèle d'embedding). Retourne le nombre de cours effectivement traités.
    """
    requete = select(Cours)
    if not force:
        requete = requete.where(Cours.embedding.is_(None))
    cours_list = (await db.execute(requete)).scalars().all()

    n = 0
    for cours in cours_list:
        texte = build_cours_text(cours.nom, cours.description)
        cours.embedding = await asyncio.to_thread(compute_embedding, texte)
        n += 1
    if n:
        await db.commit()
    return n
