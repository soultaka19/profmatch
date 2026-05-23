from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Semestre, Session
from app.models.user import User


async def _setup_aff(db_session: AsyncSession, professeur_prof: Professeur, annee: int = 2026) -> Affectation:
    sess = Session(annee=annee, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    cours = Cours(code=f"COURS-{annee}", nom="Algo", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    return aff


@pytest.mark.asyncio
async def test_create_feedback(
    db_session: AsyncSession, professeur_prof: Professeur, test_user_rh: User
):
    aff = await _setup_aff(db_session, professeur_prof)
    fb = AffectationFeedback(
        affectation_id=aff.id,
        note=4,
        commentaire="Très bon profil",
        valide_par_user_id=test_user_rh.id,
    )
    db_session.add(fb)
    await db_session.commit()
    await db_session.refresh(fb)
    assert fb.id is not None
    assert fb.note == 4
    assert fb.valide_par_user_id == test_user_rh.id
    assert fb.date_eval is not None


@pytest.mark.asyncio
@pytest.mark.parametrize("note", [0, 6, -1, 10])
async def test_feedback_note_check_constraint_invalide(
    db_session: AsyncSession, professeur_prof: Professeur, note: int
):
    aff = await _setup_aff(db_session, professeur_prof, annee=2027)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note=note))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize("note", [1, 3, 5])
async def test_feedback_note_check_constraint_valide(
    db_session: AsyncSession, professeur_prof: Professeur, note: int
):
    aff = await _setup_aff(db_session, professeur_prof, annee=2027)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note=note))
    await db_session.commit()


@pytest.mark.asyncio
async def test_feedback_cascade_par_affectation(db_session: AsyncSession, professeur_prof: Professeur):
    aff = await _setup_aff(db_session, professeur_prof)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note=3))
    db_session.add(AffectationFeedback(affectation_id=aff.id, note=5))
    await db_session.commit()

    await db_session.delete(aff)
    await db_session.commit()

    result = await db_session.execute(select(AffectationFeedback))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_feedback_valide_par_set_null(
    db_session: AsyncSession, professeur_prof: Professeur, test_user_rh: User
):
    aff = await _setup_aff(db_session, professeur_prof)
    fb = AffectationFeedback(affectation_id=aff.id, note=4, valide_par_user_id=test_user_rh.id)
    db_session.add(fb)
    await db_session.commit()
    await db_session.refresh(fb)

    await db_session.delete(test_user_rh)
    await db_session.commit()
    await db_session.refresh(fb)
    assert fb.valide_par_user_id is None
