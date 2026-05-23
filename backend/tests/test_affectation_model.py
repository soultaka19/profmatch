from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Semestre, Session
from app.models.user import User


async def _setup(db_session: AsyncSession, professeur_prof: Professeur):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    cours = Cours(code="25913 IFM", nom="Tests logiciels", credits=3)
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    return sess, cours


@pytest.mark.asyncio
async def test_create_affectation(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    aff = Affectation(
        session_id=sess.id,
        professeur_id=professeur_prof.id,
        cours_id=cours.id,
        score_total=Decimal("0.840"),
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.750"),
        score_hist=Decimal("1.000"),
        score_sem=Decimal("0.620"),
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.id is not None
    assert aff.statut == AffectationStatut.PROPOSEE
    assert aff.score_total == Decimal("0.840")


@pytest.mark.asyncio
async def test_affectation_unique_triplet(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    ))
    await db_session.commit()
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.9"), score_comp=Decimal("0.9"),
        score_exp=Decimal("0.9"), score_hist=Decimal("0.9"), score_sem=Decimal("0.9"),
    ))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_affectation_cascade_par_session(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    ))
    await db_session.commit()
    await db_session.delete(sess)
    await db_session.commit()
    result = await db_session.execute(select(Affectation))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_affectation_cascade_par_professeur(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    ))
    await db_session.commit()
    await db_session.delete(professeur_prof)
    await db_session.commit()
    result = await db_session.execute(select(Affectation))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_affectation_cascade_par_cours(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    ))
    await db_session.commit()
    await db_session.delete(cours)
    await db_session.commit()
    result = await db_session.execute(select(Affectation))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_affectation_valide_par_set_null(
    db_session: AsyncSession, professeur_prof: Professeur, test_user_rh: User
):
    sess, cours = await _setup(db_session, professeur_prof)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.84"), score_comp=Decimal("0.86"),
        score_exp=Decimal("0.75"), score_hist=Decimal("1.0"), score_sem=Decimal("0.62"),
        statut=AffectationStatut.VALIDEE,
        valide_par_user_id=test_user_rh.id,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.valide_par_user_id == test_user_rh.id

    await db_session.delete(test_user_rh)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.valide_par_user_id is None
