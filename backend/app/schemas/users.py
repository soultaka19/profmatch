from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole

RoleCreatable = Literal["prof", "rh"]


class UserCreate(BaseModel):
    """Création d'un compte par l'admin.

    L'admin ne fixe PAS le mot de passe : un jeton d'activation est généré et
    transmis hors-bande à l'utilisateur, qui définit son mot de passe via
    /api/auth/activate. Seuls les rôles `prof` et `rh` peuvent être créés —
    la création directe d'un compte admin est interdite par sécurité.
    """

    email: EmailStr
    role: RoleCreatable
    nom_complet: str = Field(min_length=1, max_length=255)


class UserUpdate(BaseModel):
    """Modification d'un utilisateur par l'admin.

    Pas de mot de passe ici : pour réinitialiser, utiliser l'endpoint
    /reinit-password qui émet un nouveau jeton d'activation.
    """

    nom_complet: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None


class UserAdminOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    nom_complet: str
    actif: bool
    est_active: bool

    class Config:
        from_attributes = True


class UserCreateResponse(BaseModel):
    """Réponse de POST /api/admin/utilisateurs : utilisateur créé + lien d'activation.

    Le token n'apparaît qu'une seule fois dans la réponse. L'admin doit le
    transmettre à l'utilisateur (par tout canal sécurisé) — il ne sera plus
    récupérable par la suite.
    """

    user: UserAdminOut
    activation_token: str
    activation_url: str


class ActivateRequest(BaseModel):
    token: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=8, max_length=128)
