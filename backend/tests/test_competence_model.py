import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.professeur import Professeur


@pytest.mark.asyncio
async def test_create_competence(db_session: AsyncSession, professeur_prof: Professeur):
    comp = Competence(
        professeur_id=professeur_prof.id,
        nom="Python",
        niveau=CompetenceNiveau.EXPERT,
        source=SourceOrigine.LLM,
    )
    db_session.add(comp)
    await db_session.commit()
    await db_session.refresh(comp)

    assert comp.id is not None
    assert comp.nom == "Python"
    assert comp.niveau == CompetenceNiveau.EXPERT
    assert comp.source == SourceOrigine.LLM
    assert comp.cree_le is not None


@pytest.mark.asyncio
async def test_competence_cascade_on_professeur_delete(
    db_session: AsyncSession, professeur_prof: Professeur
):
    db_session.add(
        Competence(
            professeur_id=professeur_prof.id,
            nom="Django",
            niveau=CompetenceNiveau.AVANCE,
            source=SourceOrigine.LLM,
        )
    )
    await db_session.commit()

    await db_session.delete(professeur_prof)
    await db_session.commit()

    result = await db_session.execute(select(Competence))
    assert result.scalars().all() == []
