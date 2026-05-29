"""Seed l'historique W3 pour la démo : valide 3 affectations sur la session 1
+ ajoute un feedback noté à chacune. Permet de montrer que W3 contribue
réellement lors d'une génération sur une session ultérieure.

Idempotent : si 3 VALIDEE+notées existent déjà sur la session 1, ne fait rien.
Lancer :  python scripts/seed_historique_demo.py
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import *  # noqa: F401,F403 — enregistre les modèles
from app.models.session import Session
from app.models.user import User, UserRole
from app.services.seed_historique import seed_historique_session


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        sess = (await db.execute(
            select(Session).order_by(Session.id).limit(1)
        )).scalar_one_or_none()
        if sess is None:
            print("Aucune session en base. Lance seed_demo + génère d'abord.")
            await engine.dispose()
            return

        rh_user = (await db.execute(
            select(User).where(User.role == UserRole.RH).order_by(User.id).limit(1)
        )).scalar_one_or_none()
        if rh_user is None:
            print("Aucun utilisateur RH. Lance seed_demo d'abord.")
            await engine.dispose()
            return

        result = await seed_historique_session(sess.id, rh_user.id, db)
        if result.deja_alimente:
            print(
                f"Session {sess.id} ({sess.semestre.value} {sess.annee}) : "
                f"historique déjà alimenté — skip."
            )
        elif result.nb_validees == 0:
            print(f"Session {sess.id} : aucune PROPOSEE disponible — skip.")
        else:
            print(
                f"Session {sess.id} ({sess.semestre.value} {sess.annee}) : "
                f"{result.nb_validees} affectations validées + notées 4/5."
            )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
