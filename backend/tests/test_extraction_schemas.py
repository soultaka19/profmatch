import pytest
from pydantic import ValidationError
from app.schemas.extraction import (
    CompetenceLLM, ExperienceLLM, FormationLLM, LangueLLM, ExtractionLLM,
)


def test_competence_valid():
    c = CompetenceLLM(nom="Python", niveau="expert")
    assert c.nom == "Python"
    assert c.niveau == "expert"


def test_competence_invalid_niveau():
    with pytest.raises(ValidationError):
        CompetenceLLM(nom="Python", niveau="god-tier")


def test_experience_actuel_means_annee_fin_null():
    e = ExperienceLLM(poste="Dev", employeur="X", annee_debut=2020, annee_fin=None)
    assert e.annee_fin is None


def test_experience_invalid_annee():
    with pytest.raises(ValidationError):
        ExperienceLLM(poste="Dev", employeur="X", annee_debut=1800, annee_fin=None)


def test_langue_natif():
    l = LangueLLM(langue="Français", niveau="natif")
    assert l.niveau == "natif"


def test_extraction_complete():
    data = ExtractionLLM(
        resume="Senior dev",
        competences=[CompetenceLLM(nom="Python", niveau="expert")],
        experiences=[ExperienceLLM(poste="Dev", employeur="X", annee_debut=2020)],
        formations=[FormationLLM(diplome="Bach", etablissement="UL", annee=2017)],
        langues=[LangueLLM(langue="Français", niveau="natif")],
    )
    assert data.resume == "Senior dev"
    assert len(data.competences) == 1


def test_extraction_resume_none():
    data = ExtractionLLM(competences=[], experiences=[], formations=[], langues=[])
    assert data.resume is None
