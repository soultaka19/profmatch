from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.programme import Programme
from app.models.session import Session, SessionStatut
from app.models.user import User
from app.schemas.admin_stats import AdminStatsOut


async def _count(db: AsyncSession, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    for cond in conditions:
        stmt = stmt.where(cond)
    return int((await db.execute(stmt)).scalar_one())


async def compute_admin_stats(db: AsyncSession) -> AdminStatsOut:
    """Compteurs agrégés du tableau de bord admin (une requête count par métrique)."""
    return AdminStatsOut(
        utilisateurs_total=await _count(db, User),
        professeurs_total=await _count(db, Professeur),
        cv_traites=await _count(db, CV, CV.statut == CVStatut.TRAITE),
        cv_en_attente=await _count(db, CV, CV.statut != CVStatut.TRAITE),
        cours_total=await _count(db, Cours),
        programmes_total=await _count(db, Programme),
        sessions_total=await _count(db, Session),
        sessions_ouvertes=await _count(db, Session, Session.statut == SessionStatut.OUVERTE),
        affectations_total=await _count(db, Affectation),
        affectations_validees=await _count(db, Affectation, Affectation.statut == AffectationStatut.VALIDEE),
    )
