"""Tests du service d'embeddings (sans appel réseau réel — mocké pour CI)."""

import math
from unittest.mock import patch

import pytest

from app.services.embeddings import (
    build_cours_text,
    build_professeur_text,
    cosine_similarity,
)


def test_cosine_similarity_identiques():
    v = [1.0, 0.0, 0.0]
    assert cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)


def test_cosine_similarity_orthogonaux():
    v1 = [1.0, 0.0]
    v2 = [0.0, 1.0]
    # (1 + 0) / 2 = 0.5
    assert cosine_similarity(v1, v2) == pytest.approx(0.5, abs=1e-6)


def test_cosine_similarity_opposes():
    v1 = [1.0, 0.0]
    v2 = [-1.0, 0.0]
    # (1 + (-1)) / 2 = 0.0
    assert cosine_similarity(v1, v2) == pytest.approx(0.0, abs=1e-6)


def test_cosine_similarity_vecteurs_vides():
    assert cosine_similarity([], []) == 0.0
    assert cosine_similarity([1.0], []) == 0.0


def test_cosine_similarity_dimensions_inegales():
    assert cosine_similarity([1.0, 0.0], [1.0]) == 0.0


def test_build_cours_text_avec_description():
    t = build_cours_text("Algorithmes", "Tri, recherche, complexité")
    assert "Algorithmes" in t
    assert "complexité" in t


def test_build_cours_text_sans_description():
    t = build_cours_text("Algorithmes", None)
    assert t == "Algorithmes"


def test_build_professeur_text_complet():
    t = build_professeur_text(
        resume_profil="Expert Python",
        competences=["Python", "SQL"],
        experiences=["Dev chez X"],
    )
    assert "Python" in t
    assert "SQL" in t
    assert "Dev chez X" in t


def test_build_professeur_text_vide():
    t = build_professeur_text(None, [], [])
    assert t == "profil non disponible"


@patch("app.services.embeddings._embed_distant")
def test_compute_embedding_shape(mock_embed):
    """compute_embedding préserve la dimension renvoyée par l'API."""
    from app.services.embeddings import compute_embedding

    mock_embed.return_value = [0.1] * 384

    result = compute_embedding("test text")
    assert len(result) == 384
    assert isinstance(result[0], float)


@patch("app.services.embeddings._embed_distant")
def test_compute_embedding_normalise_le_vecteur(mock_embed):
    """Le vecteur rendu est de norme 1, quelle que soit celle de l'API.

    Gemini ne normalise que sa dimension native (3072) : tronqué à 384, un
    vecteur `gemini-embedding-001` a une norme mesurée à 0,44. Or
    `cosine_similarity` réduit la similarité à un produit scalaire en supposant
    des vecteurs unitaires — sans normalisation, tous les scores W4 seraient
    écrasés vers 0,5 en silence.
    """
    from app.services.embeddings import compute_embedding

    mock_embed.return_value = [3.0, 4.0]  # norme 5, volontairement != 1

    result = compute_embedding("test text")
    assert pytest.approx(math.sqrt(sum(x * x for x in result)), abs=1e-9) == 1.0
    assert result == pytest.approx([0.6, 0.8])


@patch("app.services.embeddings._embed_distant")
def test_compute_embedding_vecteur_nul_ne_divise_pas_par_zero(mock_embed):
    """Un vecteur nul est rendu tel quel plutôt que de lever ZeroDivisionError."""
    from app.services.embeddings import compute_embedding

    mock_embed.return_value = [0.0, 0.0, 0.0]

    assert compute_embedding("") == [0.0, 0.0, 0.0]


@patch("app.services.embeddings._embed_distant")
def test_compute_embedding_normalise_produit_une_similarite_exploitable(mock_embed):
    """Bout en bout : deux vecteurs colinéaires de normes différentes sont
    reconnus identiques une fois normalisés — ce que la similarité brute, elle,
    manquerait complètement."""
    from app.services.embeddings import compute_embedding, cosine_similarity

    mock_embed.return_value = [1.0, 2.0, 2.0]  # norme 3
    v1 = compute_embedding("texte a")
    mock_embed.return_value = [10.0, 20.0, 20.0]  # norme 30, même direction
    v2 = compute_embedding("texte b")

    assert cosine_similarity(v1, v2) == pytest.approx(1.0, abs=1e-9)
