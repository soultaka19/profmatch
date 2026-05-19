from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crée un engine + schéma propre par test (function scope pour éviter les
    conflits d'event loop avec pytest-asyncio 1.x)."""
    engine = create_async_engine(settings.TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def _create_user(db_session: AsyncSession, email: str, role: UserRole, nom: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Test@1234"),
        role=role,
        nom_complet=nom,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_prof(db_session) -> User:
    return await _create_user(db_session, "testprof@test.ca", UserRole.PROF, "Test Prof")


@pytest_asyncio.fixture
async def test_user_rh(db_session) -> User:
    return await _create_user(db_session, "testrh@test.ca", UserRole.RH, "Test RH")


@pytest_asyncio.fixture
async def test_user_admin(db_session) -> User:
    return await _create_user(db_session, "testadmin@test.ca", UserRole.ADMIN, "Test Admin")


def _headers_for(user: User) -> dict[str, str]:
    token = create_access_token(subject=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_prof(test_user_prof) -> dict[str, str]:
    return _headers_for(test_user_prof)


@pytest.fixture
def auth_headers_rh(test_user_rh) -> dict[str, str]:
    return _headers_for(test_user_rh)


@pytest.fixture
def auth_headers_admin(test_user_admin) -> dict[str, str]:
    return _headers_for(test_user_admin)
