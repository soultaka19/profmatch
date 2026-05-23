import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


@pytest.mark.asyncio
async def test_create_programme(db_session: AsyncSession):
    prog = Programme(code="51046", nom="Programmation informatique", departement="Informatique")
    db_session.add(prog)
    await db_session.commit()
    await db_session.refresh(prog)
    assert prog.id is not None
    assert prog.code == "51046"


@pytest.mark.asyncio
async def test_programme_code_unique(db_session: AsyncSession):
    db_session.add(Programme(code="51046", nom="PI"))
    await db_session.commit()
    db_session.add(Programme(code="51046", nom="Doublon"))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_create_etape_programme(db_session: AsyncSession):
    prog = Programme(code="51046", nom="PI")
    db_session.add(prog)
    await db_session.commit()
    await db_session.refresh(prog)

    etape = EtapeProgramme(programme_id=prog.id, ordre=1, nom="Étape 1")
    db_session.add(etape)
    await db_session.commit()
    await db_session.refresh(etape)
    assert etape.id is not None
    assert etape.ordre == 1


@pytest.mark.asyncio
async def test_etape_unique_par_programme(db_session: AsyncSession):
    prog = Programme(code="51046", nom="PI")
    db_session.add(prog)
    await db_session.commit()
    await db_session.refresh(prog)

    db_session.add(EtapeProgramme(programme_id=prog.id, ordre=1, nom="Étape 1"))
    await db_session.commit()
    db_session.add(EtapeProgramme(programme_id=prog.id, ordre=1, nom="Doublon"))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_etape_cascade_par_programme(db_session: AsyncSession):
    prog = Programme(code="51046", nom="PI")
    db_session.add(prog)
    await db_session.commit()
    await db_session.refresh(prog)
    db_session.add(EtapeProgramme(programme_id=prog.id, ordre=1))
    db_session.add(EtapeProgramme(programme_id=prog.id, ordre=2))
    await db_session.commit()

    await db_session.delete(prog)
    await db_session.commit()

    result = await db_session.execute(select(EtapeProgramme))
    assert result.scalars().all() == []
