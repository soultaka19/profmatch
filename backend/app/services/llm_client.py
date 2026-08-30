import httpx
from openai import OpenAI

from app.core.config import settings


def get_llm_client() -> OpenAI:
    """Construit un client OpenAI pointant sur l'endpoint configuré.

    Tout endpoint exposant l'API OpenAI `/chat/completions` convient — le code
    n'utilise que `temperature` et `max_tokens`, sans `tools` ni
    `response_format`. Deux configurations sont documentées dans `.env.example` :
    la couche compatible OpenAI de Google Gemini (défaut actuel) et le proxy
    CoCalc de la compétition La Cité.

    Authentification, selon ce que `.env` renseigne :
    - `Authorization: Bearer <LLM_API_KEY>`, posé par le SDK via `api_key=...` —
      seul mécanisme utilisé par Gemini.
    - Cookie `COCALC_COMPUTE_SERVER_AUTH_TOKEN`, ajouté **uniquement** si
      `LLM_API_COOKIE` est renseignée. Il était exigé par le proxy CoCalc en
      façade, qui ne lit que les cookies httpx-normalisés (un header `Cookie:`
      brut via `default_headers` ne suffisait pas). L'envoyer vide à un autre
      fournisseur n'aurait aucun sens : d'où la condition.

    Les secrets viennent de .env (jamais en dur).
    """
    cookie = settings.LLM_API_COOKIE.strip()
    http_client = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": cookie} if cookie else None,
        timeout=15.0,
    )
    # max_retries=0 : le SDK fait sinon 2 retries auto avec backoff (~3 min total
    # par appel timeouté). Notre code XAI gère déjà l'échec via fallback statique
    # et notre extraction CV via sa propre boucle de validation — pas besoin du
    # retry SDK qui amplifie l'effet de saturation en parallèle.
    return OpenAI(
        base_url=settings.LLM_API_URL,
        api_key=settings.LLM_API_KEY,
        http_client=http_client,
        max_retries=0,
    )
