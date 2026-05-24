from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.schemas.users import ActivateRequest
from app.services.activation_service import ActivationError, activate_with_token
from app.services.auth_service import AccountNotActivatedError, authenticate

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user = await authenticate(db, payload.email, payload.password)
    except AccountNotActivatedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte non activé — utilisez votre lien d'activation pour définir votre mot de passe.",
        )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role, nom_complet=user.nom_complet)


@router.post("/activate", response_model=TokenResponse)
async def activate(payload: ActivateRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Définit le mot de passe à partir d'un jeton d'activation et connecte l'utilisateur.

    Endpoint public — pas d'authentification requise. Le jeton lui-même fait
    foi (one-shot, TTL 72h).
    """
    try:
        user = await activate_with_token(payload.token, payload.password, db)
    except ActivationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé — contactez l'administrateur.",
        )
    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role, nom_complet=user.nom_complet)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
