import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# TODO : compléter ces fixtures après la feature auth
# (nécessitent le modèle User et l'endpoint /auth/login)

@pytest.fixture
async def auth_headers_prof(client: AsyncClient) -> dict:
    """Fixture à implémenter après la feature auth."""
    raise NotImplementedError("auth_headers_prof — implémenter après feature/auth")


@pytest.fixture
async def auth_headers_rh(client: AsyncClient) -> dict:
    """Fixture à implémenter après la feature auth."""
    raise NotImplementedError("auth_headers_rh — implémenter après feature/auth")


@pytest.fixture
async def auth_headers_admin(client: AsyncClient) -> dict:
    """Fixture à implémenter après la feature auth."""
    raise NotImplementedError("auth_headers_admin — implémenter après feature/auth")
