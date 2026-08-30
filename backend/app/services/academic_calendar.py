"""Calendrier académique dérivé du rythme d'admission des programmes.

Règles métier (Collège La Cité) :
- Un programme qui admet uniquement en Automne suit le rythme STANDARD :
  2 sessions actives par année (Automne + Hiver), vacances au Printemps.
- Un programme qui admet aussi en Hiver et/ou Printemps suit le rythme CONTINU :
  3 sessions actives (Automne + Hiver + Printemps), aucune vacance, car les
  cohortes Hiver/Printemps n'auraient pas d'étape où progresser autrement.

Aucune colonne dédiée — le rythme est dérivé de `Programme.semestres_admission`.
"""

from __future__ import annotations

from enum import Enum

from app.models.programme import Programme
from app.models.session import Semestre, Session


class Rythme(str, Enum):
    """Rythme pédagogique annuel d'un programme."""

    STANDARD = "standard"
    CONTINU = "continu"


_CONTINU_TRIGGERS: frozenset[Semestre] = frozenset({Semestre.HIVER, Semestre.PRINTEMPS})


def rythme_for(programme: Programme) -> Rythme:
    """Renvoie le rythme dérivé du rythme d'admission du programme."""
    admissions: set[Semestre] = set(programme.semestres_admission or [])
    if admissions & _CONTINU_TRIGGERS:
        return Rythme.CONTINU
    return Rythme.STANDARD


def sessions_actives_for(programme: Programme) -> set[Semestre]:
    """Semestres actifs pour le programme (étapes dispensées)."""
    base: set[Semestre] = {Semestre.AUTOMNE, Semestre.HIVER}
    if rythme_for(programme) == Rythme.CONTINU:
        base.add(Semestre.PRINTEMPS)
    return base


def programme_actif_pour_session(programme: Programme, session: Session) -> bool:
    """Indique si le programme dispense des étapes lors de cette session."""
    return session.semestre in sessions_actives_for(programme)


def vacances_for(programme: Programme) -> set[Semestre]:
    """Semestres de vacances (sessions où le programme n'est pas dispensé).

    Limité aux 3 semestres exposés à l'admission (printemps/automne/hiver).
    L'été (rare) n'est jamais considéré comme actif ni comme vacances ici.
    """
    candidats = {Semestre.AUTOMNE, Semestre.HIVER, Semestre.PRINTEMPS}
    return candidats - sessions_actives_for(programme)
