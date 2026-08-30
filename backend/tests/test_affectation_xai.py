"""Tests XAI justification — LLM toujours mocké."""

import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.services.affectation_xai import XAIJustification, _build_prompt, generer_justification_llm
from app.services.scoring import ContexteJustification, PoidsScoring, ScoresComposants


def _ctx() -> ContexteJustification:
    poids = PoidsScoring(
        w1=Decimal("0.40"),
        w2=Decimal("0.30"),
        w3=Decimal("0.20"),
        w4=Decimal("0.10"),
    )
    composants = ScoresComposants(
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.750"),
        score_hist=Decimal("0.900"),
        score_sem=Decimal("0.920"),
    )
    return ContexteJustification(
        nom_professeur="Ahmed Diallo",
        code_cours="PI-301",
        titre_cours="Développement Web Avancé",
        nb_comp_couvertes=6,
        nb_comp_requises=7,
        competences_maitrisees=["React", "Node.js", "API REST"],
        annees_experience=9,
        nb_sessions_precedentes=3,
        note_rh_moyenne=4.5,
        similarite_semantique=0.92,
        score_global_pct=84.0,
        poids=poids,
        composants=composants,
    )


def _valid_llm_response() -> dict:
    return {
        "competences": "Maîtrise de React, Node.js, API REST. 6/7 compétences couvertes.",
        "experience": "9 ans de développement web. Score 75/100.",
        "historique": "3 sessions précédentes validées. Note RH 4,5/5.",
        "semantique": "Similarité cosinus 0,92 avec le cours.",
        "recommandation": "Score 84 %. Fortement recommandé.",
    }


@patch("app.services.llm_client.get_llm_client")
def test_justification_llm_ok(mock_client_factory):
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=json.dumps(_valid_llm_response())))]
    )
    mock_client_factory.return_value = mock_client

    result = generer_justification_llm(_ctx())
    assert "React" in result
    assert "Fortement recommandé" in result
    assert "W1" not in result  # format narratif, pas technique
    # Timeout XAI dédié transmis (≠ 15 s du client, calibré post-découplage)
    from app.core.config import settings

    kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert kwargs["timeout"] == settings.LLM_XAI_TIMEOUT_S


@patch("app.services.llm_client.get_llm_client")
def test_justification_llm_fallback_sur_json_invalide(mock_client_factory):
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="non-json response"))]
    )
    mock_client_factory.return_value = mock_client

    # Fallback doit retourner la justification statique (non vide)
    result = generer_justification_llm(_ctx(), max_retries=1)
    assert len(result) > 50
    assert "Ahmed Diallo" in result


@patch("app.services.llm_client.get_llm_client")
def test_justification_llm_fallback_sur_erreur_client(mock_client_factory):
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("API down")
    mock_client_factory.return_value = mock_client

    result = generer_justification_llm(_ctx())
    assert len(result) > 50  # fallback statique


def test_xai_justification_to_text():
    j = XAIJustification(
        competences="OK",
        experience="OK",
        historique="OK",
        semantique="OK",
        recommandation="Recommandé",
    )
    text = j.to_text()
    assert "Compétences" in text
    assert "Recommandation" in text


def test_build_prompt_contient_les_donnees_cles():
    prompt = _build_prompt(_ctx())
    assert "Ahmed Diallo" in prompt
    assert "PI-301" in prompt
    assert "40%" in prompt  # W1
