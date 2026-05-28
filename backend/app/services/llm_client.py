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

    Les deux secrets viennent de .env (jamais en dur).
    """
    http_client = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": settings.LLM_API_COOKIE},
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
