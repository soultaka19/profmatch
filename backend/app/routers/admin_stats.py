"""Statistiques du tableau de bord admin (lecture seule).

Préfixe : /api/admin/stats
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin_stats import AdminStatsOut
from app.services.admin_stats_service import compute_admin_stats

router = APIRouter()


@router.get("", response_model=AdminStatsOut)
async def get_admin_stats(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminStatsOut:
    return await compute_admin_stats(db, current_user)
