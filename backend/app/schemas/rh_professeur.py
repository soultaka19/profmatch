from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.cv import CVStatut
from app.schemas.extraction import (
    CompetenceResponse,
    ExperienceResponse,
    FormationResponse,
    LangueResponse,
    ProfilResponse,
)


class ProfesseurListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    professeur_id: int
    nom_complet: str
    email: str
    cv_statut: CVStatut | None = None
    cv_nom_original: str | None = None
    traite_le: datetime | None = None


class ProfesseurListResponse(BaseModel):
    items: list[ProfesseurListItem]
    total: int
    page: int
    page_size: int


class ProfesseurDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    professeur_id: int
    nom_complet: str
    email: str
    cv_statut: CVStatut | None = None
    cv_nom_original: str | None = None
    traite_le: datetime | None = None
    profil: ProfilResponse
    competences: list[CompetenceResponse]
    experiences: list[ExperienceResponse]
    formations: list[FormationResponse]
    langues: list[LangueResponse]
