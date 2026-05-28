"""Diagnostic isolé du LLM compétition.

Reproduit fidèlement la config du client production (`services/llm_client.py`)
et exécute 4 tests progressifs pour distinguer 4 causes possibles :

  T1 : connectivité réseau brute       (httpx GET sur l'host)
  T2 : auth proxy CoCalc + LLM         (chat.completions minimaliste)
  T3 : prompt d'extraction CV          (taille moyenne, JSON attendu)
  T4 : prompt XAI complet              (gabarit ASPECCT, équivalent prod)

Lance : python scripts/diagnostic_llm.py
"""

from __future__ import annotations

import os
import sys
import time
from urllib.parse import urlparse

# Forcer UTF-8 sur stdout — sinon Windows cp1252 plante sur les caractères non-ASCII
sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from openai import OpenAI

from app.core.config import settings


def _client(timeout_s: float = 60.0, max_retries: int = 0) -> OpenAI:
    """Clone du client de prod, paramètres timeout/retries ajustables."""
    http_client = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": settings.LLM_API_COOKIE},
        timeout=timeout_s,
    )
    return OpenAI(
        base_url=settings.LLM_API_URL,
        api_key=settings.LLM_API_KEY,
        http_client=http_client,
        max_retries=max_retries,
    )


def _section(titre: str) -> None:
    print(f"\n{'=' * 70}\n{titre}\n{'=' * 70}")


def t1_connectivite() -> None:
    _section("T1 — Connectivité brute (httpx, sans auth, sans LLM)")
    host = urlparse(settings.LLM_API_URL).netloc
    print(f"  Host  : {host}")
    print(f"  Model : {settings.LLM_MODEL}")
    print(f"  Cookie len : {len(settings.LLM_API_COOKIE)} caractères")
    print(f"  API key  len : {len(settings.LLM_API_KEY)} caractères")
    start = time.perf_counter()
    try:
        r = httpx.get(f"https://{host}", timeout=10.0)
        ms = (time.perf_counter() - start) * 1000
        print(f"  ✅ HTTP {r.status_code} en {ms:.0f} ms")
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        print(f"  ❌ Échec en {ms:.0f} ms : {type(e).__name__} — {e}")


def t2_chat_minimal() -> None:
    _section("T2 — chat.completions minimal (timeout 30 s, max_retries=0)")
    client = _client(timeout_s=30.0, max_retries=0)
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": "Réponds par 'pong' et rien d'autre."}],
            temperature=0,
            max_tokens=10,
        )
        ms = (time.perf_counter() - start) * 1000
        content = (resp.choices[0].message.content or "").strip()
        print(f"  ✅ {ms:.0f} ms — réponse: {content!r}")
        print(f"     usage: prompt={resp.usage.prompt_tokens} completion={resp.usage.completion_tokens}")
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        print(f"  ❌ Échec en {ms:.0f} ms : {type(e).__name__} — {e}")


def t3_prompt_extraction() -> None:
    _section("T3 — Prompt extraction CV (taille moyenne, JSON attendu)")
    client = _client(timeout_s=60.0, max_retries=0)
    prompt = """Extrais les informations suivantes du CV ci-dessous au format JSON strict.
Champs attendus : nom, email, competences (liste de strings), experiences (liste d'objets {poste, employeur, annees}).

CV :
Marie Dupont
marie.dupont@example.ca
Compétences : Python, SQL, Machine Learning, Docker.
Expériences : Développeuse senior chez Tech Inc (2018-2024), Stagiaire chez StartUp (2017-2018).

Retourne UNIQUEMENT le JSON, sans markdown."""
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=500,
        )
        ms = (time.perf_counter() - start) * 1000
        content = (resp.choices[0].message.content or "").strip()
        print(f"  ✅ {ms:.0f} ms — {len(content)} chars en retour")
        print(f"     usage: prompt={resp.usage.prompt_tokens} completion={resp.usage.completion_tokens}")
        print(f"     preview : {content[:200]}")
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        print(f"  ❌ Échec en {ms:.0f} ms : {type(e).__name__} — {e}")


def t4_prompt_xai_complet() -> None:
    _section("T4 — Prompt XAI complet (gabarit ASPECCT prod)")
    from app.services.affectation_xai import _build_prompt
    from app.services.scoring import (
        ContexteJustification, PoidsScoring, ScoresComposants,
    )
    from decimal import Decimal

    ctx = ContexteJustification(
        nom_professeur="Marie Lemoine",
        code_cours="IAI-301",
        titre_cours="Apprentissage automatique appliqué",
        nb_comp_couvertes=4,
        nb_comp_requises=5,
        competences_maitrisees=["Python", "TensorFlow", "Statistiques", "Pandas"],
        annees_experience=8,
        nb_sessions_precedentes=2,
        note_rh_moyenne=4.5,
        similarite_semantique=0.78,
        score_global_pct=82.3,
        poids=PoidsScoring(w1=Decimal("0.4"), w2=Decimal("0.3"), w3=Decimal("0.2"), w4=Decimal("0.1")),
        composants=ScoresComposants(
            score_comp=Decimal("0.80"), score_exp=Decimal("0.67"),
            score_hist=Decimal("0.90"), score_sem=Decimal("0.78"),
        ),
    )
    prompt = _build_prompt(ctx)
    print(f"  Prompt généré : {len(prompt)} caractères")

    client = _client(timeout_s=60.0, max_retries=0)
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        ms = (time.perf_counter() - start) * 1000
        content = (resp.choices[0].message.content or "").strip()
        print(f"  ✅ {ms:.0f} ms — {len(content)} chars en retour")
        print(f"     usage: prompt={resp.usage.prompt_tokens} completion={resp.usage.completion_tokens}")
        print(f"     preview : {content[:300]}")
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        print(f"  ❌ Échec en {ms:.0f} ms : {type(e).__name__} — {e}")


def main() -> None:
    print(f"\n{'#' * 70}")
    print(f"# Diagnostic LLM ProfMatch — {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#' * 70}")
    t1_connectivite()
    t2_chat_minimal()
    t3_prompt_extraction()
    t4_prompt_xai_complet()
    print(f"\n{'#' * 70}\n# Fin du diagnostic\n{'#' * 70}\n")


if __name__ == "__main__":
    main()
