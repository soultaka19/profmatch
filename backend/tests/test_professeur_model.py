import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.professeur import Professeur
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_user_prof_creates_professeur(db_session: AsyncSession):
    user = User(
        email="newprof@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="New Prof",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await db_session.execute(select(Professeur).where(Professeur.user_id == user.id))
    prof = result.scalar_one_or_none()
    assert prof is not None
    assert prof.user_id == user.id


@pytest.mark.asyncio
async def test_create_user_rh_does_not_create_professeur(db_session: AsyncSession):
    user = User(
        email="newrh@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.RH,
        nom_complet="New RH",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await db_session.execute(select(Professeur).where(Professeur.user_id == user.id))
    prof = result.scalar_one_or_none()
    assert prof is None
