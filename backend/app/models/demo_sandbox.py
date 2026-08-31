"""Bac à sable jetable : l'identité éphémère d'un visiteur anonyme.

ProfMatch est un produit **mono-établissement** — il n'a ni notion de client,
ni cloisonnement par organisation, et lui en inventer un toucherait les 18
tables du domaine. Le bac à sable ne recrée donc pas la base : il pose une
identité jetable (les 3 rôles), sa propre session académique, et rend invisible
d'un bac à l'autre **ce qui porte des données personnelles** — les comptes et
les professeurs, donc les CV téléversés.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session  # noqa: F401
    from app.models.user import User  # noqa: F401


class DemoSandbox(Base):
    __tablename__ = "demo_sandboxes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    expire_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    # Adresse du visiteur au moment de la création, pour la limite par IP.
    # Voir app/core/client_ip.py : derrière Vercel + Caddy, `X-Forwarded-For`
    # ne porte plus l'adresse du visiteur.
    adresse_creation: Mapped[str] = mapped_column(String(64), nullable=False)
    # Appels au LLM déjà consommés (extraction de CV, narration XAI).
    appels_ia: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="sandbox")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="sandbox")


class DemoQuotaJour(Base):
    """Appels au modèle consommés par la démonstration, par journée UTC.

    Plafond global, indépendant des bacs : un bac créé hier qui appelle
    aujourd'hui compte sur aujourd'hui. C'est la seule barrière qui ne dépend
    d'aucun en-tête, donc la seule qui protège la facture si la limite par
    adresse IP est contournée.
    """

    __tablename__ = "demo_quota_jour"

    jour: Mapped[date] = mapped_column(Date, primary_key=True)
    appels: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
