from openai import OpenAI

from app.services.llm_client import get_llm_client


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


def test_get_llm_client_sans_cookie_quand_variable_vide(monkeypatch):
    """Aucun cookie CoCalc ne doit partir chez un fournisseur qui n'en veut pas.

    Le cookie est spécifique au proxy de la compétition. Depuis la bascule vers
    Gemini, `LLM_API_COOKIE` est vide par défaut : envoyer alors un cookie de
    valeur vide n'aurait aucun sens et polluerait chaque requête.
    """
    monkeypatch.setattr("app.core.config.settings.LLM_API_COOKIE", "")
    client = get_llm_client()
    assert client._client.cookies.get("COCALC_COMPUTE_SERVER_AUTH_TOKEN") is None


def test_get_llm_client_sans_cookie_quand_variable_blanche(monkeypatch):
    """Une variable réduite à des espaces vaut une variable vide."""
    monkeypatch.setattr("app.core.config.settings.LLM_API_COOKIE", "   ")
    client = get_llm_client()
    assert client._client.cookies.get("COCALC_COMPUTE_SERVER_AUTH_TOKEN") is None
