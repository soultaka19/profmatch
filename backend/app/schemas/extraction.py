from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Schémas LLM — sortie brute de l'extraction par l'IA
# ============================================================

class CompetenceLLM(BaseModel):
    nom: str = Field(min_length=1, max_length=120)
    niveau: Literal["debutant", "intermediaire", "avance", "expert"]


class ExperienceLLM(BaseModel):
    poste: str = Field(min_length=1, max_length=255)
    employeur: str = Field(min_length=1, max_length=255)
    annee_debut: int = Field(ge=1950, le=2030)
    annee_fin: int | None = Field(default=None, ge=1950, le=2030)
    description_courte: str | None = Field(default=None, max_length=2000)


class FormationLLM(BaseModel):
    diplome: str = Field(min_length=1, max_length=255)
    etablissement: str = Field(min_length=1, max_length=255)
    annee: int = Field(ge=1950, le=2030)


class LangueLLM(BaseModel):
    langue: str = Field(min_length=1, max_length=60)
    niveau: Literal["A1", "A2", "B1", "B2", "C1", "C2", "natif"]


class ExtractionLLM(BaseModel):
    resume: str | None = Field(default=None, max_length=1000)
    competences: list[CompetenceLLM]
    experiences: list[ExperienceLLM]
    formations: list[FormationLLM]
    langues: list[LangueLLM]


# ============================================================
# Schémas API — Create/Update/Response pour les endpoints CRUD
# ============================================================

# --- Compétences ---
class CompetenceCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=120)
    niveau: Literal["debutant", "intermediaire", "avance", "expert"]


class CompetenceUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=1, max_length=120)
    niveau: Literal["debutant", "intermediaire", "avance", "expert"] | None = None


class CompetenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nom: str
    niveau: str
    source: Literal["llm", "manual"]


# --- Expériences ---
class ExperienceCreate(BaseModel):
    poste: str = Field(min_length=1, max_length=255)
    employeur: str = Field(min_length=1, max_length=255)
    annee_debut: int = Field(ge=1950, le=2030)
    annee_fin: int | None = Field(default=None, ge=1950, le=2030)
    description_courte: str | None = Field(default=None, max_length=2000)


class ExperienceUpdate(BaseModel):
    poste: str | None = Field(default=None, min_length=1, max_length=255)
    employeur: str | None = Field(default=None, min_length=1, max_length=255)
    annee_debut: int | None = Field(default=None, ge=1950, le=2030)
    annee_fin: int | None = Field(default=None, ge=1950, le=2030)
    description_courte: str | None = Field(default=None, max_length=2000)


class ExperienceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    poste: str
    employeur: str
    annee_debut: int
    annee_fin: int | None
    description_courte: str | None
    source: Literal["llm", "manual"]
    ordre: int


# --- Formations ---
class FormationCreate(BaseModel):
    diplome: str = Field(min_length=1, max_length=255)
    etablissement: str = Field(min_length=1, max_length=255)
    annee: int = Field(ge=1950, le=2030)


class FormationUpdate(BaseModel):
    diplome: str | None = Field(default=None, min_length=1, max_length=255)
    etablissement: str | None = Field(default=None, min_length=1, max_length=255)
    annee: int | None = Field(default=None, ge=1950, le=2030)


class FormationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    diplome: str
    etablissement: str
    annee: int
    source: Literal["llm", "manual"]
    ordre: int


# --- Langues ---
class LangueCreate(BaseModel):
    langue: str = Field(min_length=1, max_length=60)
    niveau: Literal["A1", "A2", "B1", "B2", "C1", "C2", "natif"]


class LangueUpdate(BaseModel):
    langue: str | None = Field(default=None, min_length=1, max_length=60)
    niveau: Literal["A1", "A2", "B1", "B2", "C1", "C2", "natif"] | None = None


class LangueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    langue: str
    niveau: str
    source: Literal["llm", "manual"]


# --- Profil ---
class ProfilUpdate(BaseModel):
    resume: str | None = Field(default=None, max_length=1000)


class ProfilResponse(BaseModel):
    resume: str | None
    source: Literal["llm", "manual"]


# --- Extraction globale ---
class ExtractionResponse(BaseModel):
    profil: ProfilResponse
    competences: list[CompetenceResponse]
    experiences: list[ExperienceResponse]
    formations: list[FormationResponse]
    langues: list[LangueResponse]
