"""Routes admin pour la gestion complète des utilisateurs.

Workflow d'invitation :
- L'admin crée un compte (email, role, nom_complet) sans définir de mot de passe.
- L'API génère un jeton d'activation à usage unique (TTL 72h) et le retourne
  dans la réponse — l'admin doit le transmettre à l'utilisateur hors-bande.
- L'utilisateur définit son mot de passe via POST /api/auth/activate.

Restrictions :
- POST/PUT ne permettent jamais de créer un compte admin (Pydantic Literal
  empêche role=admin sur la création ; tous endpoints requièrent require_role("admin")).
- Un admin ne peut pas se désactiver lui-même.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.demo_scope import possession, visibilite
from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.users import (
    UserAdminOut,
    UserCreate,
    UserCreateResponse,
    UserUpdate,
)
from app.services.activation_service import generate_setup_token

router = APIRouter()


def _activation_url(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/activate?token={token}"


async def _charger(db: AsyncSession, user_id: int, courant: User, ecriture: bool) -> User:
    """Charge un compte que `courant` a le droit de voir, ou de modifier.

    Le cloisonnement des comptes est celui qui compte le plus : un compte porte
    le professeur, donc le CV téléversé, donc des données personnelles réelles.
    Un visiteur ne doit ni les lire ni y toucher — et surtout pas réinitialiser
    le mot de passe d'un compte de l'établissement.
    """
    portee = (
        possession(User.sandbox_id, courant) if ecriture else visibilite(User.sandbox_id, courant)
    )
    user = (await db.execute(select(User).where(User.id == user_id, portee))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    return user


@router.post("", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(
    payload: UserCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserCreateResponse:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {payload.email} déjà utilisé",
        )
    user = User(
        email=payload.email,
        password_hash=None,
        role=payload.role,
        nom_complet=payload.nom_complet,
        actif=True,
        sandbox_id=current_user.sandbox_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = await generate_setup_token(user.id, db)
    return UserCreateResponse(
        user=UserAdminOut.model_validate(user),
        activation_token=token,
        activation_url=_activation_url(token),
    )


@router.get("", response_model=list[UserAdminOut])
async def list_utilisateurs(
    actif: bool | None = None,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[UserAdminOut]:
    stmt = select(User).where(visibilite(User.sandbox_id, current_user)).order_by(User.nom_complet)
    if actif is not None:
        stmt = stmt.where(User.actif.is_(actif))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{user_id}", response_model=UserAdminOut)
async def get_utilisateur(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    user = await _charger(db, user_id, current_user, ecriture=False)
    return user


@router.put("/{user_id}", response_model=UserAdminOut)
async def update_utilisateur(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    user = await _charger(db, user_id, current_user, ecriture=True)

    if payload.nom_complet is not None:
        user.nom_complet = payload.nom_complet
    if payload.role is not None:
        user.role = payload.role

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserAdminOut)
async def desactiver_utilisateur(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un admin ne peut pas se désactiver lui-même",
        )
    user = await _charger(db, user_id, current_user, ecriture=True)
    user.actif = False
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/restaurer", response_model=UserAdminOut)
async def restaurer_utilisateur(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    user = await _charger(db, user_id, current_user, ecriture=True)
    user.actif = True
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/reinit-password", response_model=UserCreateResponse)
async def reinit_password(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserCreateResponse:
    """Réémet un jeton d'activation pour l'utilisateur (réinitialisation par admin).

    Le mot de passe existant est effacé : l'utilisateur devra à nouveau définir
    le sien via le lien d'activation. Cet endpoint sert pour les mots de passe
    perdus ou compromis.
    """
    user = await _charger(db, user_id, current_user, ecriture=True)

    user.password_hash = None
    await db.commit()
    await db.refresh(user)

    token = await generate_setup_token(user.id, db)
    return UserCreateResponse(
        user=UserAdminOut.model_validate(user),
        activation_token=token,
        activation_url=_activation_url(token),
    )
