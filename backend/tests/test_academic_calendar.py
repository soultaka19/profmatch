"""Tests du service academic_calendar — règles de rythme et sessions actives."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.programme import Programme
from app.models.session import Semestre, Session
from app.services.academic_calendar import (
    Rythme,
    programme_actif_pour_session,
    rythme_for,
    sessions_actives_for,
    vacances_for,
)


def _programme(semestres: list[Semestre]) -> Programme:
    return Programme(code="X", nom="Test", departement=None, semestres_admission=semestres)


def test_rythme_standard_si_admet_seulement_automne():
    p = _programme([Semestre.AUTOMNE])
    assert rythme_for(p) == Rythme.STANDARD


def test_rythme_continu_si_admet_hiver():
    p = _programme([Semestre.AUTOMNE, Semestre.HIVER])
    assert rythme_for(p) == Rythme.CONTINU


def test_rythme_continu_si_admet_printemps():
    p = _programme([Semestre.AUTOMNE, Semestre.PRINTEMPS])
    assert rythme_for(p) == Rythme.CONTINU


def test_rythme_continu_si_admet_les_trois():
    p = _programme([Semestre.AUTOMNE, Semestre.HIVER, Semestre.PRINTEMPS])
    assert rythme_for(p) == Rythme.CONTINU


def test_sessions_actives_standard_exclut_printemps():
    p = _programme([Semestre.AUTOMNE])
    assert sessions_actives_for(p) == {Semestre.AUTOMNE, Semestre.HIVER}


def test_sessions_actives_continu_inclut_printemps():
    p = _programme([Semestre.AUTOMNE, Semestre.HIVER])
    assert sessions_actives_for(p) == {
        Semestre.AUTOMNE,
        Semestre.HIVER,
        Semestre.PRINTEMPS,
    }


def test_vacances_standard_est_printemps():
    p = _programme([Semestre.AUTOMNE])
    assert vacances_for(p) == {Semestre.PRINTEMPS}


def test_vacances_continu_est_vide():
    p = _programme([Semestre.AUTOMNE, Semestre.HIVER])
    assert vacances_for(p) == set()


def test_programme_actif_pour_session_standard_en_automne():
    p = _programme([Semestre.AUTOMNE])
    s = Session(annee=2026, semestre=Semestre.AUTOMNE)
    assert programme_actif_pour_session(p, s) is True


def test_programme_actif_pour_session_standard_en_printemps_faux():
    p = _programme([Semestre.AUTOMNE])
    s = Session(annee=2026, semestre=Semestre.PRINTEMPS)
    assert programme_actif_pour_session(p, s) is False


def test_programme_actif_pour_session_continu_en_printemps_vrai():
    p = _programme([Semestre.AUTOMNE, Semestre.HIVER])
    s = Session(annee=2026, semestre=Semestre.PRINTEMPS)
    assert programme_actif_pour_session(p, s) is True


@pytest.mark.asyncio
async def test_rythme_for_avec_programme_persiste(db_session: AsyncSession):
    """Vérifie que les helpers fonctionnent avec un Programme chargé depuis la DB."""
    p = Programme(
        code="51046",
        nom="Programmation",
        departement="TI",
        semestres_admission=[Semestre.AUTOMNE, Semestre.HIVER],
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    assert rythme_for(p) == Rythme.CONTINU
    assert sessions_actives_for(p) == {Semestre.AUTOMNE, Semestre.HIVER, Semestre.PRINTEMPS}
