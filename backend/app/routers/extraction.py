from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue, LangueNiveau
from app.models.professeur import Professeur
from app.models.user import User
from app.schemas.extraction import (
    CompetenceCreate, CompetenceResponse, CompetenceUpdate,
    ExperienceCreate, ExperienceResponse, ExperienceUpdate,
    ExtractionResponse,
    FormationCreate, FormationResponse, FormationUpdate,
    LangueCreate, LangueResponse, LangueUpdate,
    ProfilResponse, ProfilUpdate,
)

router = APIRouter()


async def _get_professeur(db: AsyncSession, user_id: int) -> Professeur:
    result = await db.execute(
        select(Professeur).where(Professeur.user_id == user_id)
    )
    return result.scalar_one()


async def _get_owned_or_404(
    db: AsyncSession,
    entity_class,
    entity_id: int,
    professeur_id: int,
    label: str,
):
    """Charge une entité possédée par le professeur ou lève 404 — factorise
    le motif `select(X).where(id, professeur_id) ; 404` répété dans les
    8 endpoints update/delete de cette extension (compétences, expériences,
    formations, langues)."""
    obj = (await db.execute(
        select(entity_class).where(
            entity_class.id == entity_id,
            entity_class.professeur_id == professeur_id,
        )
    )).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} introuvable")
    return obj


# ────────────────────────────────────────────────────────────────
# GET /cv/me/extraction — lecture globale
# ────────────────────────────────────────────────────────────────

@router.get("/me/extraction", response_model=ExtractionResponse)
async def get_my_extraction(
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> ExtractionResponse:
    prof = await _get_professeur(db, current_user.id)

    comps = (await db.execute(
        select(Competence).where(Competence.professeur_id == prof.id).order_by(Competence.cree_le)
    )).scalars().all()
    exps = (await db.execute(
        select(Experience).where(Experience.professeur_id == prof.id).order_by(Experience.ordre, Experience.cree_le)
    )).scalars().all()
    forms = (await db.execute(
        select(Formation).where(Formation.professeur_id == prof.id).order_by(Formation.ordre, Formation.cree_le)
    )).scalars().all()
    langs = (await db.execute(
        select(Langue).where(Langue.professeur_id == prof.id).order_by(Langue.cree_le)
    )).scalars().all()

    return ExtractionResponse(
        profil=ProfilResponse(resume=prof.resume_profil, source=prof.resume_profil_source.value),
        competences=[CompetenceResponse.model_validate(c) for c in comps],
        experiences=[ExperienceResponse.model_validate(e) for e in exps],
        formations=[FormationResponse.model_validate(f) for f in forms],
        langues=[LangueResponse.model_validate(l) for l in langs],
    )


# ────────────────────────────────────────────────────────────────
# PATCH /cv/me/profil
# ────────────────────────────────────────────────────────────────

@router.patch("/me/profil", response_model=ProfilResponse)
async def patch_my_profil(
    body: ProfilUpdate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> ProfilResponse:
    prof = await _get_professeur(db, current_user.id)
    prof.resume_profil = body.resume
    prof.resume_profil_source = SourceOrigine.MANUAL
    await db.commit()
    await db.refresh(prof)
    return ProfilResponse(resume=prof.resume_profil, source=prof.resume_profil_source.value)


# ────────────────────────────────────────────────────────────────
# CRUD competences
# ────────────────────────────────────────────────────────────────

@router.post("/me/competences", response_model=CompetenceResponse, status_code=status.HTTP_201_CREATED)
async def create_competence(
    body: CompetenceCreate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> CompetenceResponse:
    prof = await _get_professeur(db, current_user.id)
    comp = Competence(
        professeur_id=prof.id,
        nom=body.nom,
        niveau=CompetenceNiveau(body.niveau),
        source=SourceOrigine.MANUAL,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return CompetenceResponse.model_validate(comp)


@router.patch("/me/competences/{competence_id}", response_model=CompetenceResponse)
async def update_competence(
    competence_id: int,
    body: CompetenceUpdate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> CompetenceResponse:
    prof = await _get_professeur(db, current_user.id)
    comp = await _get_owned_or_404(db, Competence, competence_id, prof.id, "Compétence")
    if body.nom is not None:
        comp.nom = body.nom
    if body.niveau is not None:
        comp.niveau = CompetenceNiveau(body.niveau)
    comp.source = SourceOrigine.MANUAL
    await db.commit()
    await db.refresh(comp)
    return CompetenceResponse.model_validate(comp)


@router.delete("/me/competences/{competence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competence(
    competence_id: int,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> None:
    prof = await _get_professeur(db, current_user.id)
    comp = await _get_owned_or_404(db, Competence, competence_id, prof.id, "Compétence")
    await db.delete(comp)
    await db.commit()


# ────────────────────────────────────────────────────────────────
# CRUD experiences
# ────────────────────────────────────────────────────────────────

async def _next_ordre(db: AsyncSession, Entity, professeur_id: int) -> int:
    result = await db.execute(
        select(Entity.ordre)
        .where(Entity.professeur_id == professeur_id)
        .order_by(Entity.ordre.desc())
        .limit(1)
    )
    last = result.scalar()
    return (last + 1) if last is not None else 0


@router.post("/me/experiences", response_model=ExperienceResponse, status_code=status.HTTP_201_CREATED)
async def create_experience(
    body: ExperienceCreate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> ExperienceResponse:
    prof = await _get_professeur(db, current_user.id)
    next_ordre = await _next_ordre(db, Experience, prof.id)
    exp = Experience(
        professeur_id=prof.id,
        poste=body.poste,
        employeur=body.employeur,
        annee_debut=body.annee_debut,
        annee_fin=body.annee_fin,
        description_courte=body.description_courte,
        source=SourceOrigine.MANUAL,
        ordre=next_ordre,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return ExperienceResponse.model_validate(exp)


@router.patch("/me/experiences/{exp_id}", response_model=ExperienceResponse)
async def update_experience(
    exp_id: int,
    body: ExperienceUpdate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> ExperienceResponse:
    prof = await _get_professeur(db, current_user.id)
    exp = await _get_owned_or_404(db, Experience, exp_id, prof.id, "Expérience")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    exp.source = SourceOrigine.MANUAL
    await db.commit()
    await db.refresh(exp)
    return ExperienceResponse.model_validate(exp)


@router.delete("/me/experiences/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(
    exp_id: int,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> None:
    prof = await _get_professeur(db, current_user.id)
    exp = await _get_owned_or_404(db, Experience, exp_id, prof.id, "Expérience")
    await db.delete(exp)
    await db.commit()


# ────────────────────────────────────────────────────────────────
# CRUD formations
# ────────────────────────────────────────────────────────────────

@router.post("/me/formations", response_model=FormationResponse, status_code=status.HTTP_201_CREATED)
async def create_formation(
    body: FormationCreate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> FormationResponse:
    prof = await _get_professeur(db, current_user.id)
    next_ordre = await _next_ordre(db, Formation, prof.id)
    form = Formation(
        professeur_id=prof.id,
        diplome=body.diplome,
        etablissement=body.etablissement,
        annee=body.annee,
        source=SourceOrigine.MANUAL,
        ordre=next_ordre,
    )
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return FormationResponse.model_validate(form)


@router.patch("/me/formations/{formation_id}", response_model=FormationResponse)
async def update_formation(
    formation_id: int,
    body: FormationUpdate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> FormationResponse:
    prof = await _get_professeur(db, current_user.id)
    form = await _get_owned_or_404(db, Formation, formation_id, prof.id, "Formation")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(form, field, value)
    form.source = SourceOrigine.MANUAL
    await db.commit()
    await db.refresh(form)
    return FormationResponse.model_validate(form)


@router.delete("/me/formations/{formation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_formation(
    formation_id: int,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> None:
    prof = await _get_professeur(db, current_user.id)
    form = await _get_owned_or_404(db, Formation, formation_id, prof.id, "Formation")
    await db.delete(form)
    await db.commit()


# ────────────────────────────────────────────────────────────────
# CRUD langues
# ────────────────────────────────────────────────────────────────

@router.post("/me/langues", response_model=LangueResponse, status_code=status.HTTP_201_CREATED)
async def create_langue(
    body: LangueCreate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> LangueResponse:
    prof = await _get_professeur(db, current_user.id)
    lang = Langue(
        professeur_id=prof.id,
        langue=body.langue,
        niveau=LangueNiveau(body.niveau),
        source=SourceOrigine.MANUAL,
    )
    db.add(lang)
    await db.commit()
    await db.refresh(lang)
    return LangueResponse.model_validate(lang)


@router.patch("/me/langues/{langue_id}", response_model=LangueResponse)
async def update_langue(
    langue_id: int,
    body: LangueUpdate,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> LangueResponse:
    prof = await _get_professeur(db, current_user.id)
    lang = await _get_owned_or_404(db, Langue, langue_id, prof.id, "Langue")
    if body.langue is not None:
        lang.langue = body.langue
    if body.niveau is not None:
        lang.niveau = LangueNiveau(body.niveau)
    lang.source = SourceOrigine.MANUAL
    await db.commit()
    await db.refresh(lang)
    return LangueResponse.model_validate(lang)


@router.delete("/me/langues/{langue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_langue(
    langue_id: int,
    current_user: User = Depends(require_role("prof")),
    db: AsyncSession = Depends(get_db),
) -> None:
    prof = await _get_professeur(db, current_user.id)
    lang = await _get_owned_or_404(db, Langue, langue_id, prof.id, "Langue")
    await db.delete(lang)
    await db.commit()
