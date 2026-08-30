import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence


async def _make_cours(db_session: AsyncSession, code: str = "25913 IFM") -> Cours:
    cours = Cours(code=code, nom=f"Cours {code}", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    return cours


@pytest.mark.asyncio
async def test_create_cours_competence(db_session: AsyncSession):
    cours = await _make_cours(db_session)
    cc = CoursCompetence(cours_id=cours.id, nom="Python", importance=5)
    db_session.add(cc)
    await db_session.commit()
    await db_session.refresh(cc)
    assert cc.id is not None
    assert cc.importance == 5


@pytest.mark.asyncio
async def test_cours_competence_default_importance(db_session: AsyncSession):
    cours = await _make_cours(db_session)
    cc = CoursCompetence(cours_id=cours.id, nom="Tests unitaires")
    db_session.add(cc)
    await db_session.commit()
    await db_session.refresh(cc)
    assert cc.importance == 3  # default = 3 (importance moyenne)


@pytest.mark.asyncio
@pytest.mark.parametrize("imp", [0, 6, -1, 10])
async def test_cours_competence_importance_check_invalide(db_session: AsyncSession, imp: int):
    cours = await _make_cours(db_session)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="X", importance=imp))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_cours_competence_cascade_delete(db_session: AsyncSession):
    cours = await _make_cours(db_session)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    db_session.add(CoursCompetence(cours_id=cours.id, nom="SQL", importance=4))
    await db_session.commit()

    await db_session.delete(cours)
    await db_session.commit()

    result = await db_session.execute(select(CoursCompetence))
    assert result.scalars().all() == []
