from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.rh_professeur import ProfesseurDetailResponse, ProfesseurListResponse
from app.services import rh_professeur_service

router = APIRouter()


@router.get("", response_model=ProfesseurListResponse)
async def list_professeurs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    q: str | None = Query(default=None),
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> ProfesseurListResponse:
    items, total = await rh_professeur_service.list_professeurs(
        db, page, page_size, q, current_user
    )
    return ProfesseurListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{professeur_id}", response_model=ProfesseurDetailResponse)
async def get_professeur_detail(
    professeur_id: int,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> ProfesseurDetailResponse:
    detail = await rh_professeur_service.get_professeur_detail(db, professeur_id, current_user)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professeur introuvable")
    return detail
