from openai import OpenAI

from app.core.config import settings


def get_llm_client() -> OpenAI:
    """Construit un client OpenAI configuré pour l'API LLM de la compétition.

    Auth via cookie COCALC_COMPUTE_SERVER_AUTH_TOKEN dans les default_headers.
    Le cookie est lu depuis settings.LLM_API_COOKIE (jamais en dur dans le code).
    """
    return OpenAI(
        base_url=settings.LLM_API_URL,
        api_key="placeholder",  # non utilisé mais requis par le SDK
        default_headers={
            "Cookie": f"COCALC_COMPUTE_SERVER_AUTH_TOKEN={settings.LLM_API_COOKIE}"
        },
        timeout=60.0,
    )
