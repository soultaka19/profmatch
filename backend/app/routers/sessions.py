"""Routes Admin et RH pour la gestion des sessions académiques et leurs pondérations."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.session import Session
from app.models.user import User
from app.schemas.affectation import (
    PonderationsOut,
    PonderationsUpdate,
    SessionCreate,
    SessionOut,
)
from app.services.affectation_service import update_ponderations

router = APIRouter()


@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    result = await db.execute(select(Session).order_by(Session.annee.desc(), Session.semestre))
    return list(result.scalars().all())


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    existing = await db.execute(
        select(Session).where(
            Session.annee == payload.annee,
            Session.semestre == payload.semestre,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session {payload.semestre.value} {payload.annee} existe déjà",
        )
    sess = Session(annee=payload.annee, semestre=payload.semestre, statut=payload.statut)
    db.add(sess)
    await db.commit()
    await db.refresh(sess)
    return sess


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: int,
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    result = await db.execute(select(Session).where(Session.id == session_id))
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable")
    return sess


@router.get("/{session_id}/ponderations", response_model=PonderationsOut)
async def get_ponderations(
    session_id: int,
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> PonderationsOut:
    from app.models.ponderations_session import PonderationsSession
    result = await db.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == session_id)
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pondérations introuvables")
    return pond


@router.put("/{session_id}/ponderations", response_model=PonderationsOut)
async def update_session_ponderations(
    session_id: int,
    payload: PonderationsUpdate,
    current_user: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> PonderationsOut:
    try:
        pond = await update_ponderations(
            session_id, payload.w1, payload.w2, payload.w3, payload.w4, db
        )
        if payload.xai_actif is not None:
            pond.xai_actif = payload.xai_actif
            await db.commit()
            await db.refresh(pond)
        return pond
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
