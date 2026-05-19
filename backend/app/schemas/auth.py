from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    role: UserRole
    nom_complet: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    nom_complet: str

    class Config:
        from_attributes = True
