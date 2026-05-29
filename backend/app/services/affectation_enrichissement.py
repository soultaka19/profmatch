"""Service d'enrichissement de la justification XAI (Niveau 2).

Appelé en arrière-plan par la tâche Celery `enrichir_justification_xai_task`,
ce service remplace la justification STATIQUE posée au moment de la génération
par une narration LLM si l'API compétition répond. En cas d'échec, la statique
est préservée et le statut bascule en ECHEC pour visibilité.

Contrat :
- 1 seule tentative LLM (pas de retry interne — le LLM compétition est intermittent)
- Idempotent (skip si justification déjà ENRICHIE)
- Toute exception est attrapée — la tâche Celery ne doit jamais retry sur ça
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, JustificationStatut
from app.services.scoring import (
    ContexteJustification,
    PoidsScoring,
    ScoresComposants,
)

logger = logging.getLogger(__name__)


def _ctx_from_dict(d: dict) -> ContexteJustification:
    """Reconstitution symétrique de `_ctx_to_dict` côté affectation_service."""
    return ContexteJustification(
        nom_professeur=d["nom_professeur"],
        code_cours=d["code_cours"],
        titre_cours=d["titre_cours"],
        nb_comp_couvertes=d["nb_comp_couvertes"],
        nb_comp_requises=d["nb_comp_requises"],
        competences_maitrisees=list(d["competences_maitrisees"]),
        annees_experience=d["annees_experience"],
        nb_sessions_precedentes=d["nb_sessions_precedentes"],
        note_rh_moyenne=d["note_rh_moyenne"],
        similarite_semantique=d["similarite_semantique"],
        score_global_pct=d["score_global_pct"],
        poids=PoidsScoring(
            w1=Decimal(str(d["poids"]["w1"])),
            w2=Decimal(str(d["poids"]["w2"])),
            w3=Decimal(str(d["poids"]["w3"])),
            w4=Decimal(str(d["poids"]["w4"])),
        ),
        composants=ScoresComposants(
            score_comp=Decimal(str(d["composants"]["score_comp"])),
            score_exp=Decimal(str(d["composants"]["score_exp"])),
            score_hist=Decimal(str(d["composants"]["score_hist"])),
            score_sem=Decimal(str(d["composants"]["score_sem"])),
        ),
    )


def _appeler_llm_strict(ctx: ContexteJustification) -> str:
    """Appelle le LLM XAI sans fallback statique : lève toute erreur.

    Variante stricte de `affectation_xai.generer_justification_llm` (qui, lui,
    fallback sur la statique en cas d'échec). Ici on veut une exception nette
    pour distinguer succès (narration utile) d'échec (garder statique +
    marquer ECHEC).
    """
    from app.core.config import settings
    from app.services.affectation_xai import _build_prompt, XAIJustification
    from app.services.llm_client import get_llm_client

    client = get_llm_client()
    prompt = _build_prompt(ctx)
    response = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    parsed = json.loads(raw)
    justification = XAIJustification.model_validate(parsed)
    return justification.to_text()


async def enrichir_justification_xai(
    affectation_id: int,
    ctx_dict: dict,
    db: AsyncSession,
) -> dict[str, Any]:
    """Enrichit (ou tente) la justification d'une affectation.

    Retourne un petit dict de statut pour la traçabilité Celery :
      - {"skip": True}                                   si déjà ENRICHIE ou aff supprimée
      - {"statut": "enrichie"}                           si succès LLM
      - {"statut": "echec"}                              si LLM injoignable
    """
    aff = (await db.execute(
        select(Affectation).where(Affectation.id == affectation_id)
    )).scalar_one_or_none()

    if aff is None:
        logger.info("Enrichissement skip: affectation %s introuvable", affectation_id)
        return {"skip": True}
    if aff.justification_statut == JustificationStatut.ENRICHIE:
        return {"skip": True}

    try:
        ctx = _ctx_from_dict(ctx_dict)
        narration = _appeler_llm_strict(ctx)
        aff.justification = narration
        aff.justification_statut = JustificationStatut.ENRICHIE
        await db.commit()
        return {"statut": JustificationStatut.ENRICHIE.value}
    except Exception as exc:
        logger.warning(
            "Enrichissement échec aff %s : %s — statique préservée",
            affectation_id,
            type(exc).__name__,
        )
        aff.justification_statut = JustificationStatut.ECHEC
        await db.commit()
        return {"statut": JustificationStatut.ECHEC.value}
