"""Stress test du LLM compétition — sans sémaphore.

Mesure le seuil à partir duquel le LLM Ollama s'effondre sous parallélisme.
Lance N requêtes simultanées via asyncio.gather, mesure le taux de succès
et la latence par requête.

Usage : python scripts/stress_llm.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from openai import OpenAI

from app.core.config import settings


def _make_client(timeout_s: float = 60.0) -> OpenAI:
    http = httpx.Client(
        cookies={"COCALC_COMPUTE_SERVER_AUTH_TOKEN": settings.LLM_API_COOKIE},
        timeout=timeout_s,
    )
    return OpenAI(
        base_url=settings.LLM_API_URL,
        api_key=settings.LLM_API_KEY,
        http_client=http,
        max_retries=0,
    )


def _appel_unique(client: OpenAI, i: int) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        r = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": "Réponds en une phrase courte."},
                {"role": "user", "content": f"Donne une qualité du chiffre {i} en français."},
            ],
            temperature=0.3,
            max_tokens=60,
        )
        ms = (time.perf_counter() - start) * 1000
        return {"i": i, "ok": True, "ms": ms, "content": (r.choices[0].message.content or "").strip()[:80]}
    except Exception as e:
        ms = (time.perf_counter() - start) * 1000
        return {"i": i, "ok": False, "ms": ms, "error": f"{type(e).__name__}"}


async def stress(n: int, timeout_s: float = 60.0) -> None:
    print(f"\n{'=' * 70}")
    print(f"STRESS — {n} requête(s) en parallèle, timeout {timeout_s:.0f}s")
    print(f"{'=' * 70}")
    client = _make_client(timeout_s=timeout_s)
    start_global = time.perf_counter()
    results = await asyncio.gather(*[
        asyncio.to_thread(_appel_unique, client, i) for i in range(n)
    ])
    total_ms = (time.perf_counter() - start_global) * 1000

    ok = [r for r in results if r["ok"]]
    ko = [r for r in results if not r["ok"]]
    print(f"\n  Résultat global : {len(ok)}/{n} OK en {total_ms:.0f} ms ({total_ms/1000:.1f}s)")
    if ok:
        latences = sorted(r["ms"] for r in ok)
        print(f"  Latence OK     : min={latences[0]:.0f} ms  median={latences[len(latences)//2]:.0f} ms  max={latences[-1]:.0f} ms")
    if ko:
        print(f"  Échecs ({len(ko)}) : {set(r['error'] for r in ko)}")
    for r in results[:3]:
        if r["ok"]:
            print(f"    #{r['i']:2d} OK  {r['ms']:6.0f}ms : {r['content']}")
        else:
            print(f"    #{r['i']:2d} KO  {r['ms']:6.0f}ms : {r['error']}")


async def main() -> None:
    # On commence soft : vérifie que le LLM répond du tout
    await stress(1, timeout_s=30)
    # Puis on monte progressivement pour détecter le seuil de saturation
    for n in (2, 4, 8):
        await stress(n, timeout_s=60)
        await asyncio.sleep(2)  # laisse Ollama se vider entre les vagues


if __name__ == "__main__":
    asyncio.run(main())
