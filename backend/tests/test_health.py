"""Test de l'endpoint /health et de l'exposition du flag DEMO_MODE."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_expose_demo_mode(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "demo_mode" in data
    assert isinstance(data["demo_mode"], bool)
