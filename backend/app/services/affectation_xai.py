"""Justification XAI narrative par LLM pour les affectations proposées.

Framework ASPECCT (Cahier des charges §2.9) :
- ACTION  : générer une justification en 4 critères
- STEPS   : analyser chaque dimension W1-W4 puis rédiger
- PERSONA : analyste RH Collège La Cité
- EXAMPLES : exemple Ahmed Diallo / PI-301 (Cahier §2.9)
- CONTEXT : données de scoring + scores quantitatifs
- CONSTRAINTS : JSON structuré, 4 champs max 300 caractères chacun
- TEMPLATE : schéma Pydantic XAIJustification

En cas d'échec LLM (ValidationError, timeout), fallback sur
generer_justification_statique() de scoring.py.
"""

from __future__ import annotations

import json
import logging

from pydantic import BaseModel, ValidationError

from app.models.affectation import Affectation
from app.services.scoring import ContexteJustification, generer_justification_statique

logger = logging.getLogger(__name__)

XAI_PROMPT_TEMPLATE = """ACTION:
Génère une justification narrative en 4 critères pour une proposition d'affectation.

STEPS:
1. Analyser le score W1 (compétences) : ratio couvert sur requis, compétences clés maîtrisées.
2. Analyser le score W2 (expérience) : années normalisées, pertinence domaine.
3. Analyser le score W3 (historique) : sessions antérieures, note RH moyenne.
4. Analyser le score W4 (adéquation sémantique) : proximité thématique profil-cours.
5. Rédiger une recommandation globale concise.
6. Retourner UNIQUEMENT le JSON conforme au TEMPLATE.

PERSONA:
Tu es un analyste RH du Collège La Cité spécialisé en affectation pédagogique.
Tu expliques chaque décision de façon transparente et factuelle.

EXAMPLES:
{{
  "competences": "Maîtrise confirmée de React, Node.js et API REST. Le cours requiert 7 compétences ; le profil en couvre 6 (score 86 %).",
  "experience": "9 ans de développement web. Score normalisé à 75 sur 100 (base 12 ans).",
  "historique": "Enseignement du cours PI-301 validé lors de 3 sessions précédentes. Note RH moyenne 4,5/5.",
  "semantique": "Similarité cosinus de 0,92. Le champ 'architecture web' est fortement représenté.",
  "recommandation": "Score global 84 %. Fortement recommandé pour affectation."
}}

CONTEXT:
Professeur : {nom_professeur}
Cours : {code_cours} — {titre_cours}
Compétences requises : {nb_comp_requises}, couvertes : {nb_comp_couvertes}
Compétences maîtrisées : {competences_maitrisees}
Expérience : {annees_experience} ans
Sessions précédentes : {nb_sessions_precedentes}
Note RH moyenne : {note_rh_moyenne:.1f}/5
Similarité sémantique : {similarite_semantique:.3f}
Score global : {score_global_pct:.1f} %
Pondérations : W1={w1_pct}% W2={w2_pct}% W3={w3_pct}% W4={w4_pct}%

CONSTRAINTS:
- Réponds UNIQUEMENT par un objet JSON valide. Pas de markdown, pas de préambule.
- Chaque champ textuel : maximum 300 caractères.
- La langue est le FRANÇAIS.

TEMPLATE:
{{
  "competences": "<analyse W1>",
  "experience": "<analyse W2>",
  "historique": "<analyse W3>",
  "semantique": "<analyse W4>",
  "recommandation": "<synthèse globale>"
}}"""


class XAIJustification(BaseModel):
    competences: str
    experience: str
    historique: str
    semantique: str
    recommandation: str

    def to_text(self) -> str:
        return (
            f"• Compétences : {self.competences}\n"
            f"• Expérience : {self.experience}\n"
            f"• Historique : {self.historique}\n"
            f"• Adéquation sémantique : {self.semantique}\n"
            f"Recommandation : {self.recommandation}"
        )


def _build_prompt(ctx: ContexteJustification) -> str:
    w1_pct = int(float(ctx.poids.w1) * 100)
    w2_pct = int(float(ctx.poids.w2) * 100)
    w3_pct = int(float(ctx.poids.w3) * 100)
    w4_pct = int(float(ctx.poids.w4) * 100)
    return XAI_PROMPT_TEMPLATE.format(
        nom_professeur=ctx.nom_professeur,
        code_cours=ctx.code_cours,
        titre_cours=ctx.titre_cours,
        nb_comp_requises=ctx.nb_comp_requises,
        nb_comp_couvertes=ctx.nb_comp_couvertes,
        competences_maitrisees=", ".join(ctx.competences_maitrisees[:5]),
        annees_experience=ctx.annees_experience,
        nb_sessions_precedentes=ctx.nb_sessions_precedentes,
        note_rh_moyenne=ctx.note_rh_moyenne,
        similarite_semantique=ctx.similarite_semantique,
        score_global_pct=ctx.score_global_pct,
        w1_pct=w1_pct,
        w2_pct=w2_pct,
        w3_pct=w3_pct,
        w4_pct=w4_pct,
    )


def generer_justification_llm(ctx: ContexteJustification, max_retries: int = 2) -> str:
    """Génère la justification narrative XAI via LLM avec fallback statique.

    Retry automatique max `max_retries` fois si la réponse LLM n'est pas
    valide JSON ou ne correspond pas au schéma Pydantic.
    """
    from app.services.llm_client import get_llm_client
    from app.core.config import settings

    client = get_llm_client()
    prompt = _build_prompt(ctx)
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        try:
            correction = f"\n\nTon JSON précédent était invalide : {last_error}\nCorrige et retourne uniquement le JSON valide." if last_error else ""
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt + correction}],
                temperature=0.3,
            )
            raw = response.choices[0].message.content or ""
            # Extraire le JSON (robuste aux balises markdown)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw)
            justification = XAIJustification.model_validate(parsed)
            return justification.to_text()

        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = str(exc)[:200]
            logger.warning("XAI LLM attempt %d failed: %s", attempt + 1, last_error)
        except Exception as exc:
            logger.warning("XAI LLM call failed: %s", exc)
            break

    # Fallback vers la justification statique
    logger.info("XAI falling back to static justification for %s / %s", ctx.nom_professeur, ctx.code_cours)
    return generer_justification_statique(ctx)
