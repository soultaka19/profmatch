from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.cv import CVStatut


class CVResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom_original: str
    statut: CVStatut
    taille_octets: int
    mime_type: str
    televerse_le: datetime
    traite_le: datetime | None = None
    message_erreur: str | None = None


class CVTexteResponse(BaseModel):
    texte_brut: str
