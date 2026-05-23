from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours import Cours


class CoursCompetence(Base):
    """Compétence requise par un cours, avec son importance pondérante (1-5).

    L'importance module l'algorithme W1 : une compétence importance=5 manquante
    pèse plus qu'une importance=1 dans le calcul du score_competences.
    """

    __tablename__ = "cours_competences"
    __table_args__ = (
        CheckConstraint(
            "importance BETWEEN 1 AND 5",
            name="ck_cours_competences_importance_1_5",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cours_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cours.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nom: Mapped[str] = mapped_column(String(120), nullable=False)
    importance: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=3, server_default="3"
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cours: Mapped["Cours"] = relationship("Cours")
