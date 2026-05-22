from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ponderations_session import PonderationsSession
from app.models.session import Semestre, Session


async def _make_session(db_session: AsyncSession, annee: int = 2026, semestre: Semestre = Semestre.AUTOMNE) -> Session:
    sess = Session(annee=annee, semestre=semestre)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    return sess


@pytest.mark.asyncio
async def test_session_cree_ponderations_par_defaut(db_session: AsyncSession):
    sess = await _make_session(db_session)
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    assert pond.w1 == Decimal("0.400")
    assert pond.w2 == Decimal("0.300")
    assert pond.w3 == Decimal("0.200")
    assert pond.w4 == Decimal("0.100")
    assert pond.xai_actif is True


@pytest.mark.asyncio
async def test_ponderations_unique_par_session(db_session: AsyncSession):
    sess = await _make_session(db_session)
    db_session.add(PonderationsSession(
        session_id=sess.id,
        w1=Decimal("0.4"), w2=Decimal("0.3"),
        w3=Decimal("0.2"), w4=Decimal("0.1"),
    ))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_ponderations_invariant_somme_violee(db_session: AsyncSession):
    sess = await _make_session(db_session, annee=2027)
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    pond.w1 = Decimal("0.500")  # somme = 1.100 hors tolérance
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_ponderations_tolerance_acceptee(db_session: AsyncSession):
    sess = await _make_session(db_session, annee=2028)
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    # Somme = 0.401 + 0.300 + 0.200 + 0.100 = 1.001 → tolérance ≤ 0.001
    pond.w1 = Decimal("0.401")
    await db_session.commit()
    assert pond.w1 == Decimal("0.401")


@pytest.mark.asyncio
async def test_ponderations_xai_actif_togglable(db_session: AsyncSession):
    sess = await _make_session(db_session, annee=2029)
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    assert pond.xai_actif is True
    pond.xai_actif = False
    await db_session.commit()
    await db_session.refresh(pond)
    assert pond.xai_actif is False
