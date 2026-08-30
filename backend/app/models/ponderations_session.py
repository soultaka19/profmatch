from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session


class PonderationsSession(Base):
    """Poids W1-W4 par session — invariant CHECK W1+W2+W3+W4 ≈ 1.0 ± 0.001.

    Conforme Cahier des charges §2.2 : `xai_actif` permet à l'Admin de
    désactiver la justification LLM par session (XAI fallback statique).
    """

    __tablename__ = "ponderations_sessions"
    __table_args__ = (
        CheckConstraint(
            "ABS((w1 + w2 + w3 + w4) - 1.0) <= 0.001",
            name="ck_ponderations_somme_1",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    w1: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False, server_default="0.400")
    w2: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False, server_default="0.300")
    w3: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False, server_default="0.200")
    w4: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False, server_default="0.100")
    xai_actif: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    session: Mapped["Session"] = relationship("Session", back_populates="ponderations")
