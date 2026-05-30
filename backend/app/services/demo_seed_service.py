"""Service de seed pour le mode démo.

Source unique de la logique de bootstrap, réutilisée par :
- les scripts CLI (`scripts/seed_demo.py`),
- le lifespan FastAPI (auto-bootstrap au démarrage si DEMO_MODE),
- les endpoints admin de seed/reset (Phase B).

Tout est idempotent : aucun doublon, aucun crash au redémarrage.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
# Import nécessaire pour enregistrer le listener after_insert qui crée la
# ligne Professeur quand on insère un User de rôle PROF.
from app.models.professeur import Professeur  # noqa: F401
from app.models.user import User, UserRole

DEMO_USERS = [
    {
        "email": "prof@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "role": UserRole.PROF,
        "nom_complet": "Jean Tremblay",
    },
    {
        "email": "rh@defi-lacite.ca",
        "password": "Rh@LaCite2026!",
        "role": UserRole.RH,
        "nom_complet": "Marie Dubois",
    },
    {
        "email": "admin@defi-lacite.ca",
        "password": "Admin@LaCite2026!",
        "role": UserRole.ADMIN,
        "nom_complet": "Alex Martin",
    },
]


async def ensure_demo_users(db: AsyncSession) -> int:
    """Crée les 3 comptes de démo s'ils n'existent pas. Idempotent.

    Ne commit PAS : le commit est de la responsabilité de l'appelant.
    Retourne le nombre de comptes effectivement créés.
    """
    crees = 0
    for u in DEMO_USERS:
        existing = await db.execute(select(User).where(User.email == u["email"]))
        if existing.scalar_one_or_none() is not None:
            continue
        db.add(
            User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                nom_complet=u["nom_complet"],
            )
        )
        crees += 1
    await db.flush()
    return crees


async def bootstrap_on_startup() -> None:
    """Appelé par le lifespan FastAPI. No-op si DEMO_MODE est désactivé."""
    if not settings.DEMO_MODE:
        return
    async with AsyncSessionLocal() as db:
        await ensure_demo_users(db)
        await db.commit()


async def bootstrap_on_startup_forced() -> None:
    """Comme bootstrap_on_startup mais sans la garde DEMO_MODE (usage CLI explicite)."""
    async with AsyncSessionLocal() as db:
        n = await ensure_demo_users(db)
        await db.commit()
    print(f"Seed terminé : {n} compte(s) créé(s).")
