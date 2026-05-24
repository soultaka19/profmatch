"""Schémas Pydantic v2 pour Programmes, Étapes, Cursus (cours rattachés)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.cours_etape_programme import CategorieCours


# ── Programme ────────────────────────────────────────────────────────────────

class ProgrammeUpdate(BaseModel):
    """Mise à jour partielle d'un programme (PATCH-like)."""

    nom: Optional[str] = Field(None, max_length=200)
    departement: Optional[str] = Field(None, max_length=120)


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
