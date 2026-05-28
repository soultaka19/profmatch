"""Tests du helper transverse get_or_404."""

import pytest
from fastapi import HTTPException

from app.core.crud_helpers import get_or_404
from app.models.session import Semestre, Session


@pytest.mark.asyncio
async def test_get_or_404_retourne_objet_existant(db_session):
    sess = Session(annee=2030, semestre=Semestre.AUTOMNE)
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    obj = await get_or_404(Session, sess.id, db_session, label="Session")
    assert obj.id == sess.id


@pytest.mark.asyncio
async def test_get_or_404_leve_404_si_absent(db_session):
    with pytest.raises(HTTPException) as exc:
        await get_or_404(Session, 99999, db_session, label="Session")
    assert exc.value.status_code == 404
    assert "Session introuvable" in exc.value.detail


@pytest.mark.asyncio
async def test_get_or_404_label_par_defaut(db_session):
    with pytest.raises(HTTPException) as exc:
        await get_or_404(Session, 99999, db_session)
    assert exc.value.status_code == 404
    assert "introuvable" in exc.value.detail.lower()
