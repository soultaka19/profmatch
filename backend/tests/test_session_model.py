import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Semestre, Session, SessionStatut


@pytest.mark.asyncio
async def test_create_session(db_session: AsyncSession):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    assert sess.id is not None
    assert sess.annee == 2026
    assert sess.semestre == Semestre.AUTOMNE
    assert sess.statut == SessionStatut.PLANIFIEE


@pytest.mark.asyncio
async def test_session_unique_annee_semestre(db_session: AsyncSession):
    db_session.add(Session(annee=2026, semestre=Semestre.AUTOMNE))
    await db_session.commit()
    db_session.add(Session(annee=2026, semestre=Semestre.AUTOMNE))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_session_meme_annee_semestres_differents(db_session: AsyncSession):
    db_session.add(Session(annee=2026, semestre=Semestre.PRINTEMPS))
    db_session.add(Session(annee=2026, semestre=Semestre.AUTOMNE))
    db_session.add(Session(annee=2026, semestre=Semestre.HIVER))
    db_session.add(Session(annee=2026, semestre=Semestre.ETE))
    await db_session.commit()


@pytest.mark.asyncio
async def test_session_statut_ouverte(db_session: AsyncSession):
    sess = Session(annee=2026, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    assert sess.statut == SessionStatut.OUVERTE
