from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    nom_complet: str = Field(min_length=1, max_length=255)


class UserUpdate(BaseModel):
    nom_complet: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    nom_complet: str
    actif: bool

    class Config:
        from_attributes = True
