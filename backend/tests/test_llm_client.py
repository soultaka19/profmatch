from app.services.llm_client import get_llm_client
from openai import OpenAI


def test_get_llm_client_returns_openai_instance():
    client = get_llm_client()
    assert isinstance(client, OpenAI)


def test_get_llm_client_uses_cookie_auth(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.LLM_API_COOKIE", "test-cookie-value")
    client = get_llm_client()
    cookie_header = client.default_headers.get("Cookie", "")
    assert "COCALC_COMPUTE_SERVER_AUTH_TOKEN=test-cookie-value" in cookie_header


def test_get_llm_client_uses_base_url(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.LLM_API_URL", "https://example.com/api")
    client = get_llm_client()
    assert str(client.base_url).startswith("https://example.com/api")
