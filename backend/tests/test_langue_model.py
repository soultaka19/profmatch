import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competence import SourceOrigine
from app.models.langue import Langue, LangueNiveau
from app.models.professeur import Professeur


@pytest.mark.asyncio
async def test_create_langue(db_session: AsyncSession, professeur_prof: Professeur):
    lang = Langue(
        professeur_id=professeur_prof.id,
        langue="Français",
        niveau=LangueNiveau.NATIF,
        source=SourceOrigine.LLM,
    )
    db_session.add(lang)
    await db_session.commit()
    await db_session.refresh(lang)

    assert lang.id is not None
    assert lang.langue == "Français"
    assert lang.niveau == LangueNiveau.NATIF


@pytest.mark.asyncio
async def test_langue_all_cefr_levels(db_session: AsyncSession, professeur_prof: Professeur):
    for niveau in [
        LangueNiveau.A1,
        LangueNiveau.A2,
        LangueNiveau.B1,
        LangueNiveau.B2,
        LangueNiveau.C1,
        LangueNiveau.C2,
        LangueNiveau.NATIF,
    ]:
        db_session.add(
            Langue(
                professeur_id=professeur_prof.id,
                langue=f"Test-{niveau.value}",
                niveau=niveau,
                source=SourceOrigine.LLM,
            )
        )
    await db_session.commit()
