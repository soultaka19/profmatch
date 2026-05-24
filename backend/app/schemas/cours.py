"""Schémas Pydantic v2 pour Cours et CoursCompetence (compétences requises)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Cours ────────────────────────────────────────────────────────────────────

class CoursCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    nom: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    credits: Optional[int] = Field(None, ge=0, le=20)
    heures: Optional[int] = Field(None, ge=0, le=999)


class CoursUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    credits: Optional[int] = Field(None, ge=0, le=20)
    heures: Optional[int] = Field(None, ge=0, le=999)


class CoursOut(BaseModel):
    id: int
    code: str
    nom: str
    description: Optional[str]
    credits: Optional[int]
    heures: Optional[int]
    cree_le: datetime
    mis_a_jour_le: datetime

    model_config = {"from_attributes": True}


# ── CoursCompetence (compétence requise par un cours) ────────────────────────

class CoursCompetenceCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=120)
    importance: int = Field(default=3, ge=1, le=5)


class CoursCompetenceUpdate(BaseModel):
    importance: int = Field(ge=1, le=5)


class CoursCompetenceOut(BaseModel):
    id: int
    cours_id: int
    nom: str
    importance: int
    cree_le: datetime

    model_config = {"from_attributes": True}
