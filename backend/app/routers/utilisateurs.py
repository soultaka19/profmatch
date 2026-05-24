"""Routes admin pour la gestion complète des utilisateurs."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.users import UserAdminOut, UserCreate

router = APIRouter()


@router.post("/", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(
    payload: UserCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {payload.email} déjà utilisé",
        )
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        nom_complet=payload.nom_complet,
        actif=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
