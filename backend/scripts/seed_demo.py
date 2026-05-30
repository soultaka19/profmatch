"""Crée les 3 comptes de démo : prof, rh, admin.

Usage :
    docker compose exec backend python scripts/seed_demo.py
Idempotent : ne crée pas de doublons.
"""
import asyncio

from app.services.demo_seed_service import bootstrap_on_startup_forced


if __name__ == "__main__":
    asyncio.run(bootstrap_on_startup_forced())
