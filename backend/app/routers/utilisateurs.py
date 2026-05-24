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


@router.get("/", response_model=list[UserAdminOut])
async def list_utilisateurs(
    actif: bool | None = None,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[UserAdminOut]:
    stmt = select(User).order_by(User.nom_complet)
    if actif is not None:
        stmt = stmt.where(User.actif.is_(actif))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{user_id}", response_model=UserAdminOut)
async def get_utilisateur(
    user_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    return user
