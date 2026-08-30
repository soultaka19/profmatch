"""Service d'embeddings vectoriels pour le score sémantique W4.

Les vecteurs sont calculés par l'API d'embeddings du fournisseur LLM
(`EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`), via la même couche compatible
OpenAI que le reste du service — donc le même client et la même clé.

Auparavant, le calcul se faisait localement avec sentence-transformers
(all-MiniLM-L6-v2). Ce modèle imposait PyTorch dans l'image : **2 Go** d'image
et **632 Mo** de mémoire résidente dans le worker (mesuré), au-delà des 512 Mo
des paliers d'hébergement gratuits. Le déporter sur l'API ramène l'image à
quelques centaines de mégaoctets et la mémoire à celle d'un client HTTP.

Contrepartie assumée : chaque encodage devient un appel réseau (latence, quota),
là où le modèle local était gratuit une fois chargé. Le compromis se justifie
ici parce que les encodages sont rares et déjà asynchrones — extraction de CV,
création de cours, génération d'affectations — jamais sur un chemin interactif.
"""

from __future__ import annotations

import math
from typing import Sequence

from app.core.config import settings
from app.services.llm_client import get_llm_client


def _embed_distant(text: str) -> list[float]:
    """Appelle l'API d'embeddings et renvoie le vecteur brut, non normalisé.

    Seam d'isolation du réseau : les tests substituent cette fonction pour
    éviter tout appel réel, tandis que `compute_embedding` — et donc la
    normalisation — reste exercé pour de vrai.
    """
    response = get_llm_client().embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
        dimensions=settings.EMBEDDING_DIMENSIONS,
    )
    return list(response.data[0].embedding)


def compute_embedding(text: str) -> list[float]:
    """Retourne le vecteur d'embedding NORMALISÉ d'un texte.

    La normalisation est faite ici, et non déléguée au fournisseur : Gemini ne
    renvoie des vecteurs de norme 1 que sur sa dimension native (3072). Mesuré
    sur `gemini-embedding-001`, une sortie tronquée à 384 dimensions a une norme
    de **0,44**. Or `cosine_similarity` réduit la similarité à un simple produit
    scalaire *en supposant des vecteurs normalisés* : sans cette étape, tous les
    scores W4 seraient écrasés vers 0,5 sans qu'aucune erreur ne se manifeste.
    """
    vecteur = _embed_distant(text)
    norme = math.sqrt(sum(x * x for x in vecteur))
    if norme == 0.0:
        return vecteur
    return [x / norme for x in vecteur]


def cosine_similarity(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Similarité cosinus entre deux vecteurs pré-normalisés → [0, 1].

    Les vecteurs de sentence-transformers sont normalisés (norme=1) donc
    la similarité cosinus se réduit au produit scalaire, dans [-1, 1].
    On ramène à [0, 1] par (1 + dot) / 2.
    """
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    # Clamp pour absorber les erreurs numériques (dot peut dépasser 1.0001)
    dot = max(-1.0, min(1.0, dot))
    return (1.0 + dot) / 2.0


def build_cours_text(nom: str, description: str | None) -> str:
    """Texte source pour l'embedding d'un cours."""
    parts = [nom]
    if description:
        parts.append(description)
    return " ".join(parts)


def build_professeur_text(
    resume_profil: str | None,
    competences: list[str],
    experiences: list[str],
) -> str:
    """Texte source pour l'embedding d'un profil professeur."""
    parts: list[str] = []
    if resume_profil:
        parts.append(resume_profil)
    if competences:
        parts.append("Compétences : " + ", ".join(competences))
    if experiences:
        parts.append("Expériences : " + " | ".join(experiences))
    return " ".join(parts) if parts else "profil non disponible"
