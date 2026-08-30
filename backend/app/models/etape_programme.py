from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.programme import Programme


class EtapeProgramme(Base):
    """Étape (Étape 1, 2, 3, 4...) à l'intérieur d'un programme académique."""

    __tablename__ = "etapes_programme"
    __table_args__ = (UniqueConstraint("programme_id", "ordre", name="uq_etape_programme_ordre"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    programme_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("programmes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ordre: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    nom: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    programme: Mapped["Programme"] = relationship("Programme", back_populates="etapes")
