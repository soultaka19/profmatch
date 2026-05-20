from pathlib import Path
from unittest.mock import MagicMock
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session as SyncSession

from app.core.config import settings
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue, LangueNiveau
from app.models.professeur import Professeur
from app.schemas.extraction import (
    CompetenceLLM, ExperienceLLM, FormationLLM, LangueLLM, ExtractionLLM,
)
from app.services.extraction_service import (
    extract_structured_data, persist_extraction, ExtractionError,
)


FIXTURES = Path(__file__).parent / "fixtures" / "llm_responses"


@pytest.fixture
def sync_session():
    """Sync session pointant sur la même TEST_DATABASE_URL que la fixture async."""
    raw = settings.TEST_DATABASE_URL or settings.DATABASE_URL
    sync_url = raw.replace("+asyncpg", "")
    engine = create_engine(sync_url, echo=False)
    SessionLocal = sessionmaker(engine, expire_on_commit=False)
    with SessionLocal() as db:
        yield db
        db.rollback()
    engine.dispose()


def _mock_client_with_response(content: str) -> MagicMock:
    client = MagicMock()
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    client.chat.completions.create.return_value = response
    return client


def test_extract_success_first_try():
    client = _mock_client_with_response((FIXTURES / "ok_complete.json").read_text(encoding="utf-8"))
    result = extract_structured_data("CV text", client)
    assert isinstance(result, ExtractionLLM)
    assert result.resume == "Développeur Python senior avec 8 ans d'expérience."
    assert len(result.competences) == 2
    assert client.chat.completions.create.call_count == 1


def test_extract_retries_on_validation_error_then_succeeds():
    bad = (FIXTURES / "invalid_enum.json").read_text(encoding="utf-8")
    good = (FIXTURES / "ok_complete.json").read_text(encoding="utf-8")
    client = MagicMock()
    client.chat.completions.create.side_effect = [
        MagicMock(choices=[MagicMock(message=MagicMock(content=bad))]),
        MagicMock(choices=[MagicMock(message=MagicMock(content=good))]),
    ]
    result = extract_structured_data("CV", client)
    assert isinstance(result, ExtractionLLM)
    assert client.chat.completions.create.call_count == 2

    # 2e appel doit contenir le retry_hint avec l'erreur
    second_call_args = client.chat.completions.create.call_args_list[1]
    prompt_sent = second_call_args.kwargs["messages"][0]["content"]
    assert "ERREUR DE VALIDATION" in prompt_sent


def test_extract_raises_after_max_retries():
    bad = (FIXTURES / "invalid_enum.json").read_text(encoding="utf-8")
    client = MagicMock()
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=bad))]
    )
    with pytest.raises(ExtractionError):
        extract_structured_data("CV", client)
    # LLM_MAX_RETRIES = 2, donc 3 tentatives max (initial + 2 retries)
    assert client.chat.completions.create.call_count == 3


def test_extract_raises_on_malformed_json():
    bad = (FIXTURES / "malformed.txt").read_text(encoding="utf-8")
    client = MagicMock()
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=bad))]
    )
    with pytest.raises(ExtractionError):
        extract_structured_data("CV", client)


# --- persist_extraction ---

@pytest.mark.asyncio
async def test_persist_extraction_creates_all_entities(
    db_session, professeur_prof: Professeur, sync_session: SyncSession
):
    data = ExtractionLLM(
        resume="Senior",
        competences=[CompetenceLLM(nom="Python", niveau="expert")],
        experiences=[ExperienceLLM(poste="Dev", employeur="X", annee_debut=2020)],
        formations=[FormationLLM(diplome="Bach", etablissement="UL", annee=2017)],
        langues=[LangueLLM(langue="Français", niveau="natif")],
    )
    persist_extraction(sync_session, professeur_prof.id, data)
    sync_session.commit()

    comps = sync_session.execute(select(Competence)).scalars().all()
    exps = sync_session.execute(select(Experience)).scalars().all()
    forms = sync_session.execute(select(Formation)).scalars().all()
    langs = sync_session.execute(select(Langue)).scalars().all()
    prof = sync_session.get(Professeur, professeur_prof.id)

    assert len(comps) == 1 and comps[0].nom == "Python"
    assert len(exps) == 1 and exps[0].poste == "Dev"
    assert len(forms) == 1
    assert len(langs) == 1
    assert prof.resume_profil == "Senior"
    assert prof.resume_profil_source == SourceOrigine.LLM


@pytest.mark.asyncio
async def test_persist_preserves_manual_competences(
    db_session, professeur_prof: Professeur, sync_session: SyncSession
):
    sync_session.add_all([
        Competence(professeur_id=professeur_prof.id, nom="ManualSkill",
                   niveau=CompetenceNiveau.EXPERT, source=SourceOrigine.MANUAL),
        Competence(professeur_id=professeur_prof.id, nom="OldLLMSkill",
                   niveau=CompetenceNiveau.DEBUTANT, source=SourceOrigine.LLM),
    ])
    sync_session.commit()

    data = ExtractionLLM(
        resume=None,
        competences=[CompetenceLLM(nom="NewSkill", niveau="avance")],
        experiences=[], formations=[], langues=[],
    )
    persist_extraction(sync_session, professeur_prof.id, data)
    sync_session.commit()

    comps = sync_session.execute(select(Competence)).scalars().all()
    names = {c.nom for c in comps}
    assert "ManualSkill" in names       # préservé
    assert "OldLLMSkill" not in names   # supprimé
    assert "NewSkill" in names           # nouveau LLM


@pytest.mark.asyncio
async def test_persist_preserves_manual_resume(
    db_session, professeur_prof: Professeur, sync_session: SyncSession
):
    prof_sync = sync_session.get(Professeur, professeur_prof.id)
    prof_sync.resume_profil = "Manual resume"
    prof_sync.resume_profil_source = SourceOrigine.MANUAL
    sync_session.commit()

    data = ExtractionLLM(
        resume="LLM tries to overwrite",
        competences=[], experiences=[], formations=[], langues=[],
    )
    persist_extraction(sync_session, professeur_prof.id, data)
    sync_session.commit()

    sync_session.refresh(prof_sync)
    assert prof_sync.resume_profil == "Manual resume"  # NON écrasé
    assert prof_sync.resume_profil_source == SourceOrigine.MANUAL
