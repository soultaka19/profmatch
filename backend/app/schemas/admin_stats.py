from pydantic import BaseModel


class AdminStatsOut(BaseModel):
    utilisateurs_total: int
    professeurs_total: int
    cv_traites: int
    cv_en_attente: int
    cours_total: int
    programmes_total: int
    sessions_total: int
    sessions_ouvertes: int
    affectations_total: int
    affectations_validees: int
