import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.formation import Formation
from app.models.competence import SourceOrigine
from app.models.professeur import Professeur


@pytest.mark.asyncio
async def test_create_formation(db_session: AsyncSession, professeur_prof: Professeur):
    form = Formation(
        professeur_id=professeur_prof.id,
        diplome="Maîtrise en informatique",
        etablissement="Université Laval",
        annee=2017,
        source=SourceOrigine.LLM,
        ordre=0,
    )
    db_session.add(form)
    await db_session.commit()
    await db_session.refresh(form)

    assert form.id is not None
    assert form.diplome == "Maîtrise en informatique"
    assert form.annee == 2017
