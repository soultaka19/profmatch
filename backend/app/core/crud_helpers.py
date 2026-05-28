"""Helpers CRUD transverses (lookups, gardes, etc.)."""

from __future__ import annotations

from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

T = TypeVar("T", bound=Base)


async def get_or_404(
    entity_class: type[T],
    entity_id: int,
    db: AsyncSession,
    label: str = "Ressource",
) -> T:
    """Charge `entity_class` par PK ou lève 404 — remplace le motif récurrent
    `select…where(id==…) ; scalar_one_or_none ; raise HTTPException(404)`
    répété dans la majorité des routers."""
    obj = (
        await db.execute(select(entity_class).where(entity_class.id == entity_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} introuvable",
        )
    return obj
