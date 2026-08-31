"""Service RH : accès en lecture aux profils professeurs.

Les CV téléversés pendant une démonstration sont des données personnelles
réelles — quelqu'un peut très bien y déposer le sien. Les deux lectures de ce
service sont donc bornées au bac à sable de l'appelant : un visiteur voit les
professeurs de l'établissement (il en a besoin pour que la génération
d'affectations ait des candidats) et les siens, jamais ceux d'un autre visiteur.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.demo_scope import visibilite
from app.models.competence import Competence
from app.models.cv import CV
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue
from app.models.professeur import Professeur
from app.models.user import User, UserRole
from app.schemas.extraction import (
    CompetenceResponse,
    ExperienceResponse,
    FormationResponse,
    LangueResponse,
    ProfilResponse,
)
from app.schemas.rh_professeur import ProfesseurDetailResponse, ProfesseurListItem


async def list_professeurs(
    db: AsyncSession,
    page: int,
    page_size: int,
    q: str | None,
    appelant: User,
) -> tuple[list[ProfesseurListItem], int]:
    """Liste paginée des professeurs visibles, avec méta CV (LEFT JOIN)."""
    portee = visibilite(User.sandbox_id, appelant)

    base = (
        select(Professeur, User, CV)
        .join(User, Professeur.user_id == User.id)
        .outerjoin(CV, CV.professeur_id == Professeur.id)
        .where(User.role == UserRole.PROF, portee)
    )

    count_stmt = (
        select(func.count(Professeur.id))
        .join(User, Professeur.user_id == User.id)
        .where(User.role == UserRole.PROF, portee)
    )

    if q:
        like = f"%{q}%"
        condition = or_(User.nom_complet.ilike(like), User.email.ilike(like))
        base = base.where(condition)
        count_stmt = count_stmt.where(condition)

    total = (await db.execute(count_stmt)).scalar_one()

    base = base.order_by(User.nom_complet).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(base)).all()

    items = [
        ProfesseurListItem(
            professeur_id=prof.id,
            nom_complet=user.nom_complet,
            email=user.email,
            cv_statut=cv.statut if cv is not None else None,
            cv_nom_original=cv.nom_original if cv is not None else None,
            traite_le=cv.traite_le if cv is not None else None,
        )
        for prof, user, cv in rows
    ]
    return items, total


async def get_professeur_detail(
    db: AsyncSession,
    professeur_id: int,
    appelant: User,
) -> ProfesseurDetailResponse | None:
    row = (
        await db.execute(
            select(Professeur, User, CV)
            .join(User, Professeur.user_id == User.id)
            .outerjoin(CV, CV.professeur_id == Professeur.id)
            .where(
                Professeur.id == professeur_id,
                User.role == UserRole.PROF,
                visibilite(User.sandbox_id, appelant),
            )
        )
    ).first()
    if row is None:
        return None
    prof, user, cv = row

    comps = (
        (
            await db.execute(
                select(Competence)
                .where(Competence.professeur_id == prof.id)
                .order_by(Competence.cree_le)
            )
        )
        .scalars()
        .all()
    )
    exps = (
        (
            await db.execute(
                select(Experience)
                .where(Experience.professeur_id == prof.id)
                .order_by(Experience.ordre, Experience.cree_le)
            )
        )
        .scalars()
        .all()
    )
    forms = (
        (
            await db.execute(
                select(Formation)
                .where(Formation.professeur_id == prof.id)
                .order_by(Formation.ordre, Formation.cree_le)
            )
        )
        .scalars()
        .all()
    )
    langs = (
        (
            await db.execute(
                select(Langue).where(Langue.professeur_id == prof.id).order_by(Langue.cree_le)
            )
        )
        .scalars()
        .all()
    )

    return ProfesseurDetailResponse(
        professeur_id=prof.id,
        nom_complet=user.nom_complet,
        email=user.email,
        cv_statut=cv.statut if cv is not None else None,
        cv_nom_original=cv.nom_original if cv is not None else None,
        traite_le=cv.traite_le if cv is not None else None,
        profil=ProfilResponse(resume=prof.resume_profil, source=prof.resume_profil_source.value),
        competences=[CompetenceResponse.model_validate(c) for c in comps],
        experiences=[ExperienceResponse.model_validate(e) for e in exps],
        formations=[FormationResponse.model_validate(f) for f in forms],
        langues=[LangueResponse.model_validate(lang) for lang in langs],
    )
