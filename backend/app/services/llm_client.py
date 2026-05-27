import httpx
from openai import OpenAI

from app.core.config import settings


def get_llm_client() -> OpenAI:
    """Construit un client OpenAI configuré pour l'API LLM de la compétition.

    Auth en deux couches :
    - Cookie `COCALC_COMPUTE_SERVER_AUTH_TOKEN` posé sur le CookieJar httpx — exigé
      par le proxy CoCalc en façade. Un header `Cookie:` brut (via default_headers)
      ne suffit pas : le proxy ne lit que les cookies httpx-normalisés.
    - `Authorization: Bearer <api_key>` — exigé par l'inner LLM (vLLM/Ollama)
      derrière le proxy. Passé via `api_key=...` du SDK OpenAI.

    Si LLM_API_KEY est absent du .env, on passe "none" pour satisfaire la validation
    du SDK OpenAI (le proxy CoCalc n'exige que le cookie).

    Les deux secrets viennent de .env (jamais en dur).
    """
    http_client = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": settings.LLM_API_COOKIE},
        timeout=60.0,
    )
    # Le SDK OpenAI v1+ refuse une api_key vide — on passe "none" comme placeholder
    # si la clé n'est pas configurée (auth par cookie suffit dans ce cas).
    api_key = settings.LLM_API_KEY or "none"
    return OpenAI(
        base_url=settings.LLM_API_URL,
        api_key=api_key,
        http_client=http_client,
    )
