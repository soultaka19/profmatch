from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from sqlalchemy import select

from app.models.cv import CV, CVStatut
from app.models.competence import Competence
from app.models.professeur import Professeur

FIXTURES = Path(__file__).parent / "fixtures" / "llm_responses"


def _mock_client_with_fixture(fixture_name: str) -> MagicMock:
    client = MagicMock()
    content = (FIXTURES / fixture_name).read_text(encoding="utf-8")
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=content))]
    )
    return client


@pytest.mark.asyncio
async def test_extract_cv_data_llm_success(
    db_session, professeur_prof: Professeur, celery_eager
):
    cv = CV(
        professeur_id=professeur_prof.id,
        nom_original="test.pdf",
        chemin_fichier="x/test.pdf",
        taille_octets=100,
        mime_type="application/pdf",
        statut=CVStatut.EN_COURS,
        texte_brut="CV de test",
    )
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    with patch("app.tasks.extraction_tasks.get_llm_client", return_value=_mock_client_with_fixture("ok_complete.json")):
        from app.tasks.extraction_tasks import extract_cv_data_llm
        extract_cv_data_llm(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.TRAITE
    assert cv.traite_le is not None
    assert cv.message_erreur is None

    comps = (await db_session.execute(select(Competence))).scalars().all()
    assert len(comps) == 2


@pytest.mark.asyncio
async def test_extract_cv_data_llm_marks_erreur_on_extraction_error(
    db_session, professeur_prof: Professeur, celery_eager
):
    cv = CV(
        professeur_id=professeur_prof.id,
        nom_original="test.pdf",
        chemin_fichier="x/test.pdf",
        taille_octets=100,
        mime_type="application/pdf",
        statut=CVStatut.EN_COURS,
        texte_brut="CV invalide",
    )
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    bad_client = _mock_client_with_fixture("malformed.txt")

    with patch("app.tasks.extraction_tasks.get_llm_client", return_value=bad_client):
        from app.tasks.extraction_tasks import extract_cv_data_llm
        extract_cv_data_llm(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.ERREUR
    assert cv.message_erreur is not None
    assert "Extraction IA" in cv.message_erreur


@pytest.mark.asyncio
async def test_extract_cv_data_llm_noop_if_no_text(
    db_session, professeur_prof: Professeur, celery_eager
):
    cv = CV(
        professeur_id=professeur_prof.id,
        nom_original="test.pdf",
        chemin_fichier="x/test.pdf",
        taille_octets=100,
        mime_type="application/pdf",
        statut=CVStatut.EN_COURS,
        texte_brut=None,
    )
    db_session.add(cv)
    await db_session.commit()

    with patch("app.tasks.extraction_tasks.get_llm_client") as mock_client_factory:
        from app.tasks.extraction_tasks import extract_cv_data_llm
        extract_cv_data_llm(cv.id)

    mock_client_factory.assert_not_called()
