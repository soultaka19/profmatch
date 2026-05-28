"""Routes RH et Admin pour la génération et révision des affectations."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_role
from app.db.session import get_db
from app.models.affectation import Affectation, AffectationStatut
from app.models.cours_etape_programme import CoursEtapeProgramme
from app.models.professeur import Professeur
from app.models.user import User
from app.schemas.affectation import (
    AffectationManuelleCreate,
    AffectationOut,
    AffectationProfOut,
    AffectationValidateRequest,
    FeedbackCreate,
    FeedbackOut,
    GenererAffectationsRequest,
    GenererAffectationsResponse,
    ProfesseurDisponibleOut,
)
from app.services.affectation_service import (
    ajouter_feedback,
    creer_affectation_manuelle,
    lister_professeurs_disponibles,
    valider_affectation,
)
from app.tasks.affectation_tasks import generer_affectations_task

router = APIRouter()

# Chargement eager des relations utilisées pour enrichir AffectationOut
_RELATIONS = (
    selectinload(Affectation.cours),
    selectinload(Affectation.professeur).selectinload(Professeur.user),
)

_RELATIONS_PROF = (
    selectinload(Affectation.cours),
    selectinload(Affectation.session),
)


def _to_out(aff: Affectation) -> AffectationOut:
    """Convertit une Affectation ORM en AffectationOut en résolvant les noms.

    Les relations `cours` et `professeur.user` doivent être chargées au préalable
    (via `_RELATIONS`) pour éviter tout lazy-load en contexte async.
    """
    out = AffectationOut.model_validate(aff)
    if aff.cours is not None:
        out.cours_nom = aff.cours.nom
        out.cours_code = aff.cours.code
    if aff.professeur is not None and aff.professeur.user is not None:
        out.professeur_nom = aff.professeur.user.nom_complet
    return out


def _to_prof_out(aff: Affectation) -> AffectationProfOut:
    out = AffectationProfOut.model_validate(aff)
    out.session_nom = aff.session.nom if aff.session is not None else f"Session {aff.session_id}"
    out.cours_code = aff.cours.code if aff.cours is not None else None
    out.cours_nom = aff.cours.nom if aff.cours is not None else None
    return out


@router.post(
    "/generer",
    response_model=GenererAffectationsResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generer_affectations(
    payload: GenererAffectationsRequest,
    current_user: User = Depends(require_role("rh")),
) -> GenererAffectationsResponse:
    """Lance la génération asynchrone des affectations via Celery."""
    task = generer_affectations_task.delay(
        payload.session_id, payload.programme_ids, payload.etape_ids
    )
    return GenererAffectationsResponse(task_id=task.id)


@router.get("/generation/{task_id}")
async def get_generation_status(
    task_id: str,
    current_user: User = Depends(require_role("rh", "admin")),
) -> dict:
    """Retourne le statut de la tâche Celery de génération."""
    from app.worker import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(task_id, app=celery_app)
    if result.state == "SUCCESS":
        return {"status": "done", "result": result.get()}
    if result.state == "FAILURE":
        return {"status": "error", "detail": str(result.info)}
    return {"status": result.state.lower()}


@router.get("/", response_model=list[AffectationOut])
async def list_affectations(
    session_id: int | None = None,
    cours_id: int | None = None,
    statut: AffectationStatut | None = None,
    programme_ids: list[int] | None = Query(default=None),
    etape_ids: list[int] | None = Query(default=None),
    current_user: User = Depends(require_role("rh", "admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AffectationOut]:
    query = select(Affectation).options(*_RELATIONS)
    if session_id is not None:
        query = query.where(Affectation.session_id == session_id)
    if cours_id is not None:
        query = query.where(Affectation.cours_id == cours_id)
    if statut is not None:
        query = query.where(Affectation.statut == statut)
    if programme_ids or etape_ids:
        query = query.join(
            CoursEtapeProgramme, CoursEtapeProgramme.cours_id == Affectation.cours_id
        )
        if programme_ids:
            query = query.where(CoursEtapeProgramme.programme_id.in_(programme_ids))
        if etape_ids:
            query = query.where(CoursEtapeProgramme.etape_id.in_(etape_ids))
        query = query.distinct()
    query = query.order_by(Affectation.score_total.desc())
    result = await db.execute(query)
    return [_to_out(aff) for aff in result.scalars().all()]


@router.post(
    "/manuelle",
    response_model=AffectationOut,
    status_code=status.HTTP_201_CREATED,
)
async def creer_affectation_manuelle_endpoint(
    payload: AffectationManuelleCreate,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> AffectationOut:
    """REV-04 : le RH affecte manuellement un professeur à un cours."""
    try:
        aff = await creer_affectation_manuelle(
            payload.session_id, payload.professeur_id, payload.cours_id, current_user.id, db
        )
    except ValueError as exc:
        msg = str(exc)
        code = (
            status.HTTP_409_CONFLICT
            if "non traité" in msg
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=code, detail=msg)

    result = await db.execute(
        select(Affectation).options(*_RELATIONS).where(Affectation.id == aff.id)
    )
    return _to_out(result.scalar_one())


@router.get(
    "/professeurs-disponibles",
    response_model=list[ProfesseurDisponibleOut],
)
async def professeurs_disponibles(
    session_id: int,
    cours_id: int,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> list[ProfesseurDisponibleOut]:
    """Profs avec CV traité non encore affectés à ce (session, cours)."""
    profs = await lister_professeurs_disponibles(session_id, cours_id, db)
    return [
        ProfesseurDisponibleOut(professeur_id=pid, nom_complet=nom)
        for pid, nom in profs
    ]


@router.get(
    "/mes-affectations",
    response_model=list[AffectationProfOut],
    summary="Mes affectations professeur",
)
async def mes_affectations(
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> list[AffectationProfOut]:
    prof_result = await db.execute(
        select(Professeur).where(Professeur.user_id == current_user.id)
    )
    prof = prof_result.scalar_one_or_none()
    if prof is None:
        return []

    result = await db.execute(
        select(Affectation)
        .options(*_RELATIONS_PROF)
        .where(Affectation.professeur_id == prof.id)
        .where(Affectation.statut == AffectationStatut.VALIDEE)
        .order_by(Affectation.cree_le.desc())
    )
    return [_to_prof_out(aff) for aff in result.scalars().all()]


@router.get("/{affectation_id}", response_model=AffectationOut)
async def get_affectation(
    affectation_id: int,
    current_user: User = Depends(require_role("rh", "admin", "prof")),
    db: AsyncSession = Depends(get_db),
) -> AffectationOut:
    result = await db.execute(
        select(Affectation).options(*_RELATIONS).where(Affectation.id == affectation_id)
    )
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affectation introuvable")
    # Prof : peut voir uniquement ses propres affectations
    if current_user.role.value == "prof":
        from sqlalchemy import select as sa_select
        prof_result = await db.execute(
            sa_select(Professeur).where(Professeur.user_id == current_user.id)
        )
        prof = prof_result.scalar_one_or_none()
        if not prof or aff.professeur_id != prof.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    return _to_out(aff)


@router.patch("/{affectation_id}", response_model=AffectationOut)
async def valider_ou_rejeter(
    affectation_id: int,
    payload: AffectationValidateRequest,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> AffectationOut:
    try:
        aff = await valider_affectation(
            affectation_id, current_user.id, payload.statut, db
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await db.execute(
        select(Affectation).options(*_RELATIONS).where(Affectation.id == aff.id)
    )
    return _to_out(result.scalar_one())


@router.post(
    "/{affectation_id}/feedback",
    response_model=FeedbackOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_feedback(
    affectation_id: int,
    payload: FeedbackCreate,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> FeedbackOut:
    return await ajouter_feedback(
        affectation_id, current_user.id, payload.note, payload.commentaire, db
    )
