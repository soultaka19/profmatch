"""Tests unitaires des schémas Pydantic Programme/Étape/Cursus."""

import pytest
from pydantic import ValidationError

from app.models.cours_etape_programme import CategorieCours
from app.schemas.programme import (
    CursusCreate,
    EtapeCreate,
    EtapeUpdate,
    ProgrammeUpdate,
)


def test_programme_update_tous_champs_optionnels():
    p = ProgrammeUpdate()
    assert p.nom is None and p.departement is None


def test_programme_update_max_length():
    with pytest.raises(ValidationError):
        ProgrammeUpdate(nom="x" * 201)


def test_etape_create_ordre_positif():
    e = EtapeCreate(ordre=1, nom="Étape 1")
    assert e.ordre == 1 and e.nom == "Étape 1"


def test_etape_create_ordre_invalide():
    with pytest.raises(ValidationError):
        EtapeCreate(ordre=0)
    with pytest.raises(ValidationError):
        EtapeCreate(ordre=-1)


def test_etape_update_nom_optionnel():
    e = EtapeUpdate(nom=None)
    assert e.nom is None


def test_cursus_create_par_defaut_obligatoire():
    c = CursusCreate(cours_id=1)
    assert c.categorie == CategorieCours.OBLIGATOIRE


def test_cursus_create_categorie_explicite():
    c = CursusCreate(cours_id=42, categorie=CategorieCours.CHOIX_FRANCAIS)
    assert c.categorie == CategorieCours.CHOIX_FRANCAIS
