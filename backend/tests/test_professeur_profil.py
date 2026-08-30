import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competence import SourceOrigine
from app.models.professeur import Professeur


@pytest.mark.asyncio
async def test_professeur_default_resume(db_session: AsyncSession, professeur_prof: Professeur):
    assert professeur_prof.resume_profil is None
    assert professeur_prof.resume_profil_source == SourceOrigine.LLM


@pytest.mark.asyncio
async def test_professeur_set_resume(db_session: AsyncSession, professeur_prof: Professeur):
    professeur_prof.resume_profil = "Dev senior 8 ans d'expérience backend."
    professeur_prof.resume_profil_source = SourceOrigine.MANUAL
    await db_session.commit()
    await db_session.refresh(professeur_prof)

    assert professeur_prof.resume_profil == "Dev senior 8 ans d'expérience backend."
    assert professeur_prof.resume_profil_source == SourceOrigine.MANUAL
