from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class ProfilMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nom_complet: str
    role: UserRole
    cree_le: datetime


class ProfilMeUpdate(BaseModel):
    nom_complet: str = Field(min_length=1, max_length=255)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
