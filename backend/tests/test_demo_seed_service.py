"""Tests du service de seed démo (bootstrap des comptes)."""
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professeur import Professeur
from app.models.user import User, UserRole
from app.services.demo_seed_service import ensure_demo_users


@pytest.mark.asyncio
async def test_ensure_demo_users_cree_trois_comptes(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()

    total = (await db_session.execute(select(func.count(User.id)))).scalar_one()
    assert total == 3

    roles = set(
        (await db_session.execute(select(User.role))).scalars().all()
    )
    assert roles == {UserRole.PROF, UserRole.RH, UserRole.ADMIN}


@pytest.mark.asyncio
async def test_ensure_demo_users_idempotent(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()
    await ensure_demo_users(db_session)
    await db_session.commit()

    total = (await db_session.execute(select(func.count(User.id)))).scalar_one()
    assert total == 3


@pytest.mark.asyncio
async def test_ensure_demo_users_cree_la_ligne_professeur(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()

    prof_count = (await db_session.execute(select(func.count(Professeur.id)))).scalar_one()
    assert prof_count == 1  # le listener after_insert crée la ligne pour le compte prof
