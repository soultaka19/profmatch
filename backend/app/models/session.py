from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    SmallInteger,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.affectation import Affectation
    from app.models.demo_sandbox import DemoSandbox
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
    __table_args__ = (UniqueConstraint("annee", "semestre", name="uq_session_annee_semestre"),)

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

    # NULL = session réelle de l'établissement. Une session de bac à sable
    # isole ce que le visiteur génère : affectations et pondérations y pendent
    # déjà, c'est l'axe de cloisonnement que le domaine offrait de lui-même.
    sandbox_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("demo_sandboxes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    sandbox: Mapped["DemoSandbox | None"] = relationship("DemoSandbox", back_populates="sessions")

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

    connection.execute(PonderationsSession.__table__.insert().values(session_id=target.id))
