from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cv import CVStatut
from app.models.user import User
from app.schemas.cv import CVResponse, CVTexteResponse
from app.services import cv_service

router = APIRouter()


@router.post("/upload", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> CVResponse:
    cv = await cv_service.upload(file, current_user, db)
    return CVResponse.model_validate(cv)


@router.get("/me", response_model=CVResponse)
async def get_my_cv(
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> CVResponse:
    cv = await cv_service.get_my_cv(current_user, db)
    if cv is None:
        raise HTTPException(status_code=404, detail="Aucun CV téléversé.")
    return CVResponse.model_validate(cv)


@router.get("/me/texte", response_model=CVTexteResponse)
async def get_my_cv_texte(
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> CVTexteResponse:
    cv = await cv_service.get_my_cv(current_user, db)
    if cv is None or cv.statut != CVStatut.TRAITE:
        raise HTTPException(status_code=404, detail="Texte non disponible.")
    return CVTexteResponse(texte_brut=cv.texte_brut)
