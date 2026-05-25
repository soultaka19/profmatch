"""Schémas Pydantic v2 pour le domaine affectation / sessions / programmes."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.affectation import AffectationOrigine, AffectationStatut
from app.models.session import Semestre, SessionStatut


# ── Programme ───────────────────────────────────────────────────────────────

class ProgrammeOut(BaseModel):
    id: int
    code: str
    nom: str
    departement: Optional[str]
    semestres_admission: list[Semestre]

    model_config = {"from_attributes": True}


class ProgrammeCreate(BaseModel):
    code: str = Field(max_length=20)
    nom: str = Field(max_length=200)
    departement: Optional[str] = Field(None, max_length=120)
    semestres_admission: list[Semestre] = Field(default_factory=lambda: [Semestre.AUTOMNE])


# ── Session ──────────────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: int
    annee: int
    semestre: Semestre
    statut: SessionStatut
    nom: str
    cree_le: datetime

    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    annee: int = Field(ge=2020, le=2100)
    semestre: Semestre
    statut: SessionStatut = SessionStatut.PLANIFIEE


class SessionUpdate(BaseModel):
    statut: SessionStatut


# ── Pondérations ─────────────────────────────────────────────────────────────

class PonderationsOut(BaseModel):
    session_id: int
    w1: float
    w2: float
    w3: float
    w4: float
    xai_actif: bool
    mis_a_jour_le: datetime

    model_config = {"from_attributes": True}


class PonderationsUpdate(BaseModel):
    w1: Decimal = Field(ge=0, le=1)
    w2: Decimal = Field(ge=0, le=1)
    w3: Decimal = Field(ge=0, le=1)
    w4: Decimal = Field(ge=0, le=1)
    xai_actif: Optional[bool] = None

    @model_validator(mode="after")
    def check_somme(self) -> "PonderationsUpdate":
        somme = self.w1 + self.w2 + self.w3 + self.w4
        if abs(somme - Decimal("1")) > Decimal("0.001"):
            raise ValueError(f"W1+W2+W3+W4 = {somme} (attendu 1.000 ± 0.001)")
        return self


# ── Affectation ───────────────────────────────────────────────────────────────

class AffectationOut(BaseModel):
    id: int
    session_id: int
    professeur_id: int
    cours_id: int
    score_total: float
    score_comp: float
    score_exp: float
    score_hist: float
    score_sem: float
    justification: Optional[str]
    statut: AffectationStatut
    origine: AffectationOrigine
    valide_par_user_id: Optional[int]
    valide_le: Optional[datetime]
    cree_le: datetime
    # Champs enrichis (résolus via les relations) pour l'affichage RH/Admin
    cours_nom: Optional[str] = None
    cours_code: Optional[str] = None
    professeur_nom: Optional[str] = None

    model_config = {"from_attributes": True}


class GenererAffectationsRequest(BaseModel):
    session_id: int
    programme_ids: list[int] = Field(min_length=1)
    etape_ids: list[int] | None = None


class GenererAffectationsResponse(BaseModel):
    task_id: str
    message: str = "Génération des affectations en cours"


class AffectationManuelleCreate(BaseModel):
    session_id: int
    professeur_id: int
    cours_id: int


class ProfesseurDisponibleOut(BaseModel):
    professeur_id: int
    nom_complet: str


class AffectationValidateRequest(BaseModel):
    statut: AffectationStatut = Field(
        description="Statut cible : validee ou rejetee"
    )

    @model_validator(mode="after")
    def check_statut(self) -> "AffectationValidateRequest":
        if self.statut == AffectationStatut.PROPOSEE:
            raise ValueError("Le statut cible ne peut pas être 'proposee'")
        return self


class FeedbackCreate(BaseModel):
    note: int = Field(ge=1, le=5)
    commentaire: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    affectation_id: int
    note: int
    commentaire: Optional[str]
    valide_par_user_id: Optional[int]
    date_eval: datetime

    model_config = {"from_attributes": True}
