"""Tests unitaires des schémas Pydantic Cours + CoursCompetence."""

import pytest
from pydantic import ValidationError

from app.schemas.cours import (
    CoursCompetenceCreate,
    CoursCompetenceUpdate,
    CoursCreate,
    CoursUpdate,
)


def test_cours_create_min():
    c = CoursCreate(code="INF1001", nom="Intro")
    assert c.code == "INF1001"
    assert c.nom == "Intro"
    assert c.description is None
    assert c.credits is None
    assert c.heures is None


def test_cours_create_complet():
    c = CoursCreate(
        code="INF2001",
        nom="Algorithmes",
        description="Étude des algorithmes fondamentaux",
        credits=3,
        heures=45,
    )
    assert c.credits == 3
    assert c.heures == 45


def test_cours_create_code_obligatoire():
    with pytest.raises(ValidationError):
        CoursCreate(nom="Pas de code")  # type: ignore[call-arg]


def test_cours_create_max_length_code():
    with pytest.raises(ValidationError):
        CoursCreate(code="x" * 41, nom="N")


def test_cours_create_credits_negatif_refuse():
    with pytest.raises(ValidationError):
        CoursCreate(code="A", nom="N", credits=-1)


def test_cours_update_tous_optionnels():
    u = CoursUpdate()
    assert u.nom is None and u.description is None and u.credits is None and u.heures is None


def test_competence_create_par_defaut():
    cc = CoursCompetenceCreate(nom="Python")
    assert cc.importance == 3


def test_competence_create_importance_hors_bornes():
    with pytest.raises(ValidationError):
        CoursCompetenceCreate(nom="X", importance=0)
    with pytest.raises(ValidationError):
        CoursCompetenceCreate(nom="X", importance=6)


def test_competence_update():
    u = CoursCompetenceUpdate(importance=5)
    assert u.importance == 5
