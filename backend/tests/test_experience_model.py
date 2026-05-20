import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.experience import Experience
from app.models.competence import SourceOrigine
from app.models.professeur import Professeur


@pytest.mark.asyncio
async def test_create_experience(db_session: AsyncSession, professeur_prof: Professeur):
    exp = Experience(
        professeur_id=professeur_prof.id,
        poste="Développeur Python",
        employeur="Acme Inc",
        annee_debut=2020,
        annee_fin=None,
        description_courte="Backend Django + Celery",
        source=SourceOrigine.LLM,
        ordre=0,
    )
    db_session.add(exp)
    await db_session.commit()
    await db_session.refresh(exp)

    assert exp.id is not None
    assert exp.poste == "Développeur Python"
    assert exp.annee_fin is None
    assert exp.ordre == 0


@pytest.mark.asyncio
async def test_experience_with_annee_fin(db_session: AsyncSession, professeur_prof: Professeur):
    exp = Experience(
        professeur_id=professeur_prof.id,
        poste="Stagiaire",
        employeur="Beta Corp",
        annee_debut=2018,
        annee_fin=2019,
        source=SourceOrigine.LLM,
    )
    db_session.add(exp)
    await db_session.commit()

    result = await db_session.execute(
        select(Experience).where(Experience.poste == "Stagiaire")
    )
    saved = result.scalar_one()
    assert saved.annee_fin == 2019
