"""Reproduit fidèlement l'exemple du PDF Instructions-API-LLM.pdf,
avec la clé API fournie en argument. Ne lit PAS le .env : on isole le test.

Usage : python scripts/test_llm_pdf.py <api_key>
"""
import sys
import time

# Forcer UTF-8 sur stdout (Windows cp1252 plante sur les accents)
sys.stdout.reconfigure(encoding="utf-8")

import httpx
from openai import OpenAI


def run(api_key: str) -> None:
    http = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": "FC3yLm9Wyu4Fz7FS"},
        timeout=60.0,
    )
    client = OpenAI(
        base_url="https://defi-informatique.cocalc.cloud/api",
        api_key=api_key,
        http_client=http,
        max_retries=0,
    )

    print(f"=== Appel exact PDF — clé {api_key[:10]}...{api_key[-4:]} ===")
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model="gpt-oss-ctx24k:120b",
            messages=[
                {"role": "system", "content": "Tu es un assistant utile qui répond brièvement."},
                {"role": "user", "content": "Bonjour!"},
            ],
        )
        ms = (time.perf_counter() - start) * 1000
        content = resp.choices[0].message.content
        print(f"✅ Réponse reçue en {ms:.0f} ms")
        print(f"   prompt_tokens={resp.usage.prompt_tokens}  completion_tokens={resp.usage.completion_tokens}")
        print(f"   contenu : {content!r}")
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        print(f"❌ Échec en {ms:.0f} ms : {type(e).__name__}")
        print(f"   message : {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage : python scripts/test_llm_pdf.py <api_key>")
        sys.exit(1)
    run(sys.argv[1])
