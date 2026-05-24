import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.auth_service import authenticate


@pytest.mark.asyncio
async def test_authenticate_valid_credentials(db_session, test_user_prof):
    user = await authenticate(db_session, "testprof@test.ca", "Test@1234")
    assert user is not None
    assert user.id == test_user_prof.id
    assert user.role.value == "prof"


@pytest.mark.asyncio
async def test_authenticate_wrong_password(db_session, test_user_prof):
    user = await authenticate(db_session, "testprof@test.ca", "wrong-password")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_unknown_email(db_session):
    user = await authenticate(db_session, "doesnotexist@test.ca", "anything")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_refuse_utilisateur_inactif(db_session: AsyncSession):
    u = User(
        email="inactif@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Inactif",
        actif=False,
    )
    db_session.add(u)
    await db_session.commit()

    result = await authenticate(db_session, "inactif@test.ca", "Test@1234")
    assert result is None


@pytest.mark.asyncio
async def test_authenticate_leve_account_not_activated(db_session: AsyncSession):
    from app.services.auth_service import AccountNotActivatedError

    u = User(
        email="aactiver@test.ca",
        password_hash=None,
        role=UserRole.PROF,
        nom_complet="A Activer",
    )
    db_session.add(u)
    await db_session.commit()

    with pytest.raises(AccountNotActivatedError):
        await authenticate(db_session, "aactiver@test.ca", "n-importe-quoi")
