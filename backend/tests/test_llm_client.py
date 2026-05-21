from app.services.llm_client import get_llm_client
from openai import OpenAI


def test_get_llm_client_returns_openai_instance():
    client = get_llm_client()
    assert isinstance(client, OpenAI)


def test_get_llm_client_uses_cookie_auth(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.LLM_API_COOKIE", "test-cookie-value")
    client = get_llm_client()
    # Le cookie doit être posé sur le httpx.CookieJar interne, pas dans default_headers
    # (le proxy CoCalc ne lit que les cookies httpx-normalisés, pas un Cookie: brut).
    assert client._client.cookies.get("COCALC_COMPUTE_SERVER_AUTH_TOKEN") == "test-cookie-value"


def test_get_llm_client_uses_api_key_from_settings(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.LLM_API_KEY", "sk-test-key")
    client = get_llm_client()
    # L'inner LLM derrière le proxy CoCalc exige son propre Bearer token.
    assert client.api_key == "sk-test-key"


def test_get_llm_client_uses_base_url(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.LLM_API_URL", "https://example.com/api")
    client = get_llm_client()
    assert str(client.base_url).startswith("https://example.com/api")
