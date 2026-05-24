"""Tests du service d'activation de mot de passe."""

import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.password_setup_token import PasswordSetupToken
from app.models.user import User, UserRole
from app.services.activation_service import (
    ActivationError,
    activate_with_token,
    generate_setup_token,
)


@pytest.mark.asyncio
async def test_generate_setup_token_cree_un_token(db_session: AsyncSession):
    user = User(email="x@test.ca", password_hash=None, role=UserRole.PROF, nom_complet="X")
    db_session.add(user)
    await db_session.commit()

    token = await generate_setup_token(user.id, db_session)
    assert isinstance(token, str)
    assert len(token) >= 32

    result = await db_session.execute(
        select(PasswordSetupToken).where(PasswordSetupToken.user_id == user.id)
    )
    db_tokens = result.scalars().all()
    assert len(db_tokens) == 1
    assert db_tokens[0].used_at is None


@pytest.mark.asyncio
async def test_generate_setup_token_invalide_anciens_tokens(db_session: AsyncSession):
    user = User(email="y@test.ca", password_hash=None, role=UserRole.PROF, nom_complet="Y")
    db_session.add(user)
    await db_session.commit()

    token1 = await generate_setup_token(user.id, db_session)
    token2 = await generate_setup_token(user.id, db_session)
    assert token1 != token2

    # Le premier token doit être marqué used_at
    result = await db_session.execute(
        select(PasswordSetupToken).where(PasswordSetupToken.token == token1)
    )
    old = result.scalar_one()
    assert old.used_at is not None

    # Le second est toujours actif
    result = await db_session.execute(
        select(PasswordSetupToken).where(PasswordSetupToken.token == token2)
    )
    new = result.scalar_one()
    assert new.used_at is None


@pytest.mark.asyncio
async def test_activate_with_token_definit_password_et_consomme_token(db_session: AsyncSession):
    user = User(email="z@test.ca", password_hash=None, role=UserRole.PROF, nom_complet="Z")
    db_session.add(user)
    await db_session.commit()

    token = await generate_setup_token(user.id, db_session)

    activated = await activate_with_token(token, "MonNouveauMotDePasse123", db_session)
    assert activated.id == user.id
    assert activated.password_hash is not None
    assert verify_password("MonNouveauMotDePasse123", activated.password_hash)

    # Token marqué utilisé
    result = await db_session.execute(
        select(PasswordSetupToken).where(PasswordSetupToken.token == token)
    )
    db_token = result.scalar_one()
    assert db_token.used_at is not None


@pytest.mark.asyncio
async def test_activate_with_token_refuse_deuxieme_usage(db_session: AsyncSession):
    user = User(email="a@test.ca", password_hash=None, role=UserRole.PROF, nom_complet="A")
    db_session.add(user)
    await db_session.commit()
    token = await generate_setup_token(user.id, db_session)

    await activate_with_token(token, "Password1234", db_session)
    with pytest.raises(ActivationError, match="déjà utilisé"):
        await activate_with_token(token, "AutrePass5678", db_session)


@pytest.mark.asyncio
async def test_activate_with_token_refuse_token_inconnu(db_session: AsyncSession):
    with pytest.raises(ActivationError, match="introuvable"):
        await activate_with_token("token-inexistant", "Password1234", db_session)


@pytest.mark.asyncio
async def test_activate_with_token_refuse_token_expire(db_session: AsyncSession):
    user = User(email="b@test.ca", password_hash=None, role=UserRole.PROF, nom_complet="B")
    db_session.add(user)
    await db_session.commit()

    # Token avec expires_at dans le passé
    past = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)
    db_token = PasswordSetupToken(token="expired-token", user_id=user.id, expires_at=past)
    db_session.add(db_token)
    await db_session.commit()

    with pytest.raises(ActivationError, match="expiré"):
        await activate_with_token("expired-token", "Password1234", db_session)
