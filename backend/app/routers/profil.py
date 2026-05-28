from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.profil import PasswordChangeRequest, ProfilMeOut, ProfilMeUpdate

router = APIRouter()


@router.get("/me", response_model=ProfilMeOut)
async def get_profil(current_user: User = Depends(get_current_user)) -> ProfilMeOut:
    return ProfilMeOut.model_validate(current_user)


@router.patch("/me", response_model=ProfilMeOut)
async def update_profil(
    payload: ProfilMeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfilMeOut:
    current_user.nom_complet = payload.nom_complet
    await db.commit()
    await db.refresh(current_user)
    return ProfilMeOut.model_validate(current_user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if current_user.password_hash is None or not verify_password(
        payload.current_password, current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )
    current_user.password_hash = hash_password(payload.new_password)
    await db.commit()
