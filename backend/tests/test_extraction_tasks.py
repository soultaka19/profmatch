from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select

from app.models.competence import Competence
from app.models.cv import CV, CVStatut
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
async def test_extract_cv_data_llm_success(db_session, professeur_prof: Professeur, celery_eager):
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

    with patch(
        "app.tasks.extraction_tasks.get_llm_client",
        return_value=_mock_client_with_fixture("ok_complete.json"),
    ):
        from app.tasks.extraction_tasks import extract_cv_data_llm

        extract_cv_data_llm(cv.id)

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.TRAITE
    assert cv.traite_le is not None
    assert cv.message_erreur is None

    comps = (await db_session.execute(select(Competence))).scalars().all()
    assert len(comps) == 2


@pytest.mark.asyncio
async def test_extract_cv_data_llm_persists_professeur_embedding(
    db_session, professeur_prof: Professeur, celery_eager
):
    """Après extraction réussie, l'embedding W4 du professeur est calculé à
    partir du résumé + compétences + expériences et persisté (sinon W4 = 0)."""
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

    fake_vec = [0.11, 0.22, 0.33]
    with (
        patch(
            "app.tasks.extraction_tasks.get_llm_client",
            return_value=_mock_client_with_fixture("ok_complete.json"),
        ),
        patch("app.services.embeddings.compute_embedding", return_value=fake_vec) as mock_embed,
    ):
        from app.tasks.extraction_tasks import extract_cv_data_llm

        extract_cv_data_llm(cv.id)

    await db_session.refresh(professeur_prof)
    assert professeur_prof.embedding == fake_vec
    mock_embed.assert_called_once()
    # Le texte source doit refléter les données extraites (compétences notamment).
    texte_source = mock_embed.call_args.args[0]
    assert "Python" in texte_source


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
async def test_extract_cv_data_llm_marks_erreur_when_retries_exhausted(
    db_session, professeur_prof: Professeur, celery_eager
):
    """Quand le client LLM lève une exception transient et que les retries
    sont épuisés, le CV doit se terminer en statut=ERREUR avec un message
    explicite — JAMAIS rester en EN_COURS (bug observé en local avec une
    auth invalide → spinner perpétuel côté frontend, dropzone bloquée)."""
    cv = CV(
        professeur_id=professeur_prof.id,
        nom_original="test.pdf",
        chemin_fichier="x/test.pdf",
        taille_octets=100,
        mime_type="application/pdf",
        statut=CVStatut.EN_COURS,
        texte_brut="CV avec API LLM down",
    )
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    from openai import OpenAIError

    from app.tasks.extraction_tasks import extract_cv_data_llm

    failing_client = MagicMock()
    failing_client.chat.completions.create.side_effect = OpenAIError("API down")

    # Simule "dernier essai" : la task croit qu'elle est déjà au max de retries.
    extract_cv_data_llm.push_request(retries=extract_cv_data_llm.max_retries)
    try:
        with patch("app.tasks.extraction_tasks.get_llm_client", return_value=failing_client):
            with pytest.raises(OpenAIError):
                extract_cv_data_llm.run(cv.id)
    finally:
        extract_cv_data_llm.pop_request()

    await db_session.refresh(cv)
    assert cv.statut == CVStatut.ERREUR, f"attendu ERREUR, obtenu {cv.statut}"
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
