import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.cv import CV, CVStatut
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_cv_can_be_created_with_default_statut(db_session: AsyncSession):
    user = User(
        email="cvuser@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="CV User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user, ["professeur"])

    cv = CV(
        professeur_id=user.professeur.id,
        nom_original="cv.pdf",
        chemin_fichier="42/abc.pdf",
        taille_octets=1024,
        mime_type="application/pdf",
    )
    db_session.add(cv)
    await db_session.commit()
    await db_session.refresh(cv)

    assert cv.id is not None
    assert cv.statut == CVStatut.EN_ATTENTE
    assert cv.texte_brut is None
    assert cv.message_erreur is None
    assert cv.traite_le is None
    assert cv.televerse_le is not None
