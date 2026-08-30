"""Schémas Pydantic v2 pour Programmes, Étapes, Cursus (cours rattachés)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.cours_etape_programme import CategorieCours
from app.models.session import Semestre
from app.services.academic_calendar import Rythme

# ── Programme ────────────────────────────────────────────────────────────────


class ProgrammeUpdate(BaseModel):
    """Mise à jour partielle d'un programme (PATCH-like)."""

    nom: Optional[str] = Field(None, max_length=200)
    departement: Optional[str] = Field(None, max_length=120)
    semestres_admission: Optional[list[Semestre]] = None


class ProgrammeCalendrierOut(BaseModel):
    """Calendrier dérivé du rythme d'admission d'un programme."""

    programme_id: int
    rythme: Rythme
    sessions_actives: list[Semestre]
    vacances: list[Semestre]
    etapes_total: int


# ── Étape ────────────────────────────────────────────────────────────────────


class EtapeCreate(BaseModel):
    ordre: int = Field(ge=1, le=20)
    nom: Optional[str] = Field(None, max_length=120)


class EtapeUpdate(BaseModel):
    nom: Optional[str] = Field(None, max_length=120)


class EtapeOut(BaseModel):
    id: int
    programme_id: int
    ordre: int
    nom: Optional[str]
    cree_le: datetime

    model_config = {"from_attributes": True}


class EtapeStatutOut(BaseModel):
    """Étape enrichie de son statut d'affectation pour une session."""

    id: int
    programme_id: int
    ordre: int
    nom: Optional[str]
    total_cours: int
    cours_couverts: int
    affectation_complete: bool

    model_config = {"from_attributes": True}


# ── Cursus (cours dans une étape d'un programme) ─────────────────────────────


class CursusCreate(BaseModel):
    cours_id: int = Field(ge=1)
    categorie: CategorieCours = CategorieCours.OBLIGATOIRE


class CursusUpdate(BaseModel):
    categorie: CategorieCours


class CursusOut(BaseModel):
    id: int
    programme_id: int
    etape_id: int
    cours_id: int
    categorie: CategorieCours
    cree_le: datetime

    model_config = {"from_attributes": True}


# ── Cours (read-only, exposé pour rattachement au cursus) ─────────────────────


class CoursReadOnlyOut(BaseModel):
    id: int
    code: str
    nom: str
    credits: Optional[int]
    heures: Optional[int]

    model_config = {"from_attributes": True}
