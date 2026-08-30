import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _prog_etape(
    db_session: AsyncSession, code: str = "51046"
) -> tuple[Programme, EtapeProgramme]:
    prog = Programme(code=code, nom=f"Prog {code}")
    db_session.add(prog)
    await db_session.commit()
    await db_session.refresh(prog)
    etape = EtapeProgramme(programme_id=prog.id, ordre=1, nom="Étape 1")
    db_session.add(etape)
    await db_session.commit()
    await db_session.refresh(etape)
    return prog, etape


@pytest.mark.asyncio
async def test_create_cours(db_session: AsyncSession):
    cours = Cours(
        code="30733 IFM",
        nom="Introduction à la programmation",
        description="Cours d'initiation",
        credits=3,
        heures=42,
    )
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    assert cours.id is not None
    assert cours.code == "30733 IFM"
    assert cours.credits == 3


@pytest.mark.asyncio
async def test_cours_code_unique(db_session: AsyncSession):
    db_session.add(Cours(code="30733 IFM", nom="Intro prog", credits=3))
    await db_session.commit()
    db_session.add(Cours(code="30733 IFM", nom="Doublon", credits=3))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_lier_cours_a_etape_programme(db_session: AsyncSession):
    prog, etape = await _prog_etape(db_session)
    cours = Cours(code="25913 IFM", nom="Tests logiciels", credits=3, heures=42)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    lien = CoursEtapeProgramme(
        programme_id=prog.id,
        etape_id=etape.id,
        cours_id=cours.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    assert lien.id is not None
    assert lien.categorie == CategorieCours.OBLIGATOIRE


@pytest.mark.asyncio
async def test_lien_unique_par_triplet(db_session: AsyncSession):
    prog, etape = await _prog_etape(db_session)
    cours = Cours(code="25913 IFM", nom="Tests logiciels", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    db_session.add(
        CoursEtapeProgramme(
            programme_id=prog.id,
            etape_id=etape.id,
            cours_id=cours.id,
            categorie=CategorieCours.OBLIGATOIRE,
        )
    )
    await db_session.commit()

    db_session.add(
        CoursEtapeProgramme(
            programme_id=prog.id,
            etape_id=etape.id,
            cours_id=cours.id,
            categorie=CategorieCours.CHOIX_FRANCAIS,
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_cascade_cours_efface_les_liens(db_session: AsyncSession):
    prog, etape = await _prog_etape(db_session)
    cours = Cours(code="25913 IFM", nom="Tests", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=prog.id,
            etape_id=etape.id,
            cours_id=cours.id,
            categorie=CategorieCours.OBLIGATOIRE,
        )
    )
    await db_session.commit()

    await db_session.delete(cours)
    await db_session.commit()

    result = await db_session.execute(select(CoursEtapeProgramme))
    assert result.scalars().all() == []
