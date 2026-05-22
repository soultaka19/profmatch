"""Service d'embeddings vectoriels pour le score sémantique W4.

Utilise sentence-transformers (all-MiniLM-L6-v2, 384 dimensions) pour
calculer les représentations vectorielles des profils et descriptions de cours.
Le modèle est chargé une seule fois en mémoire (singleton lazy).
"""

from __future__ import annotations

import math
from functools import lru_cache
from typing import Sequence

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def compute_embedding(text: str) -> list[float]:
    """Retourne le vecteur d'embedding d'un texte (384 dimensions)."""
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


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
