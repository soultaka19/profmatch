from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.demo_scope import visibilite
from app.db.base import Base
from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.programme import Programme
from app.models.session import Session, SessionStatut
from app.models.user import User
from app.schemas.admin_stats import AdminStatsOut


async def _count(db: AsyncSession, model: type[Base], *conditions: ColumnElement[bool]) -> int:
    stmt = select(func.count()).select_from(model)
    for cond in conditions:
        stmt = stmt.where(cond)
    return int((await db.execute(stmt)).scalar_one())


async def _count_joint(
    db: AsyncSession,
    model: type[Base],
    *joins,
    conditions: tuple[ColumnElement[bool], ...] = (),
) -> int:
    """Compte avec jointures — pour les tables qui n'ont pas de `sandbox_id`
    mais qui en héritent d'un compte ou d'une session."""
    stmt = select(func.count()).select_from(model)
    for cible, condition in joins:
        stmt = stmt.join(cible, condition)
    for cond in conditions:
        stmt = stmt.where(cond)
    return int((await db.execute(stmt)).scalar_one())


async def compute_admin_stats(db: AsyncSession, appelant: User) -> AdminStatsOut:
    """Compteurs agrégés du tableau de bord admin (une requête count par métrique).

    Les compteurs sont bornés à la portée de l'appelant : un visiteur ne doit
    pas déduire, d'un total qui bouge, ce que fait un autre visiteur. Cours et
    programmes sont le référentiel partagé — ils n'ont pas de portée.
    """
    portee_users = visibilite(User.sandbox_id, appelant)
    portee_sessions = visibilite(Session.sandbox_id, appelant)
    jointure_prof = ((User, Professeur.user_id == User.id),)
    jointure_cv = (
        (Professeur, CV.professeur_id == Professeur.id),
        (User, Professeur.user_id == User.id),
    )
    jointure_aff = ((Session, Affectation.session_id == Session.id),)

    return AdminStatsOut(
        utilisateurs_total=await _count(db, User, portee_users),
        professeurs_total=await _count_joint(
            db, Professeur, *jointure_prof, conditions=(portee_users,)
        ),
        cv_traites=await _count_joint(
            db, CV, *jointure_cv, conditions=(CV.statut == CVStatut.TRAITE, portee_users)
        ),
        # « en attente » = tout CV pas encore traité (EN_ATTENTE, EN_COURS, ERREUR).
        cv_en_attente=await _count_joint(
            db, CV, *jointure_cv, conditions=(CV.statut != CVStatut.TRAITE, portee_users)
        ),
        cours_total=await _count(db, Cours),
        programmes_total=await _count(db, Programme),
        sessions_total=await _count(db, Session, portee_sessions),
        sessions_ouvertes=await _count(
            db, Session, portee_sessions, Session.statut == SessionStatut.OUVERTE
        ),
        affectations_total=await _count_joint(
            db, Affectation, *jointure_aff, conditions=(portee_sessions,)
        ),
        affectations_validees=await _count_joint(
            db,
            Affectation,
            *jointure_aff,
            conditions=(portee_sessions, Affectation.statut == AffectationStatut.VALIDEE),
        ),
    )
