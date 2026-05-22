from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Numeric,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours import Cours
    from app.models.professeur import Professeur
    from app.models.session import Session
    from app.models.user import User


class AffectationStatut(str, Enum):
    PROPOSEE = "proposee"
    VALIDEE = "validee"
    REJETEE = "rejetee"


class Affectation(Base):
    """Proposition d'affectation Professeur ↔ Cours pour une Session donnée.

    Conforme Cahier des charges §2.2 : colonnes score_total et 4 sous-scores
    DECIMAL(4,3), invariant W1+W2+W3+W4=1.0 garanti côté service.
    """

    __tablename__ = "affectations"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "professeur_id",
            "cours_id",
            name="uq_affectation_session_prof_cours",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cours_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cours.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    score_total: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_comp: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_exp: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_hist: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_sem: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)

    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[AffectationStatut] = mapped_column(
        SQLEnum(
            AffectationStatut,
            name="affectation_statut",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=AffectationStatut.PROPOSEE,
        server_default=AffectationStatut.PROPOSEE.value,
    )
    valide_par_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    valide_le: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    session: Mapped["Session"] = relationship("Session", back_populates="affectations")
    professeur: Mapped["Professeur"] = relationship("Professeur")
    cours: Mapped["Cours"] = relationship("Cours")
    valide_par: Mapped["User | None"] = relationship("User")
