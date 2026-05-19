"""Crée les 3 comptes de démo : prof, rh, admin.

Usage :
    docker compose exec backend python scripts/seed_demo.py
    # ou en local :
    python scripts/seed_demo.py

Idempotent : ne crée pas de doublons si les emails existent déjà.
"""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.professeur import Professeur  # noqa: F401  - enregistre le listener after_insert
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


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        for u in DEMO_USERS:
            existing = await db.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none() is not None:
                print(f"[skip] {u['email']} existe déjà")
                continue
            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                nom_complet=u["nom_complet"],
            )
            db.add(user)
            print(f"[create] {u['email']} ({u['role'].value})")
        await db.commit()

        # Vérifie que le listener after_insert a bien créé la ligne professeur.
        result = await db.execute(
            select(Professeur).join(User).where(User.email == "prof@defi-lacite.ca")
        )
        prof_row = result.scalar_one_or_none()
        if prof_row is None:
            print("[error] La ligne professeur n'a pas été créée pour prof@defi-lacite.ca")
        else:
            print(f"[ok] Ligne professeur id={prof_row.id} pour prof@defi-lacite.ca")

    await engine.dispose()
    print("Seed terminé.")


if __name__ == "__main__":
    asyncio.run(seed())
