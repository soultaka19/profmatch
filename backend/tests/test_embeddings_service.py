"""Tests du service d'embeddings (sans modèle réel — mocké pour CI)."""

import pytest
from unittest.mock import MagicMock, patch
import numpy as np

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


@patch("app.services.embeddings._get_model")
def test_compute_embedding_shape(mock_get_model):
    """Vérifie que compute_embedding retourne un vecteur de taille correcte (mocké)."""
    from app.services.embeddings import compute_embedding

    fake_vector = np.array([0.1] * 384, dtype="float32")
    mock_model = MagicMock()
    mock_model.encode.return_value = fake_vector
    mock_get_model.return_value = mock_model

    result = compute_embedding("test text")
    assert len(result) == 384
    assert isinstance(result[0], float)
