from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SQLEnum,
    SmallInteger,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.affectation import Affectation
    from app.models.ponderations_session import PonderationsSession


class Semestre(str, Enum):
    PRINTEMPS = "printemps"
    ETE = "ete"
    AUTOMNE = "automne"
    HIVER = "hiver"


class SessionStatut(str, Enum):
    PLANIFIEE = "planifiee"
    OUVERTE = "ouverte"
    FERMEE = "fermee"


class Session(Base):
    """Session académique (ex. Automne 2026) — clé naturelle (annee, semestre)."""

    __tablename__ = "sessions"
    __table_args__ = (
        UniqueConstraint("annee", "semestre", name="uq_session_annee_semestre"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    annee: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    semestre: Mapped[Semestre] = mapped_column(
        SQLEnum(
            Semestre,
            name="semestre",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    statut: Mapped[SessionStatut] = mapped_column(
        SQLEnum(
            SessionStatut,
            name="session_statut",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=SessionStatut.PLANIFIEE,
        server_default=SessionStatut.PLANIFIEE.value,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    affectations: Mapped[list["Affectation"]] = relationship(
        "Affectation", back_populates="session", cascade="all, delete-orphan"
    )
    ponderations: Mapped["PonderationsSession | None"] = relationship(
        "PonderationsSession",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def nom(self) -> str:
        """Affichage humain : 'Automne 2026'."""
        return f"{self.semestre.value.capitalize()} {self.annee}"


@event.listens_for(Session, "after_insert")
def _create_ponderations_for_session(mapper, connection, target: Session) -> None:
    from app.models.ponderations_session import PonderationsSession

    connection.execute(
        PonderationsSession.__table__.insert().values(session_id=target.id)
    )
