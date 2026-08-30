from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.competence import SourceOrigine


class LangueNiveau(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"
    NATIF = "natif"


class Langue(Base):
    __tablename__ = "langues"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    langue: Mapped[str] = mapped_column(String(60), nullable=False)
    niveau: Mapped[LangueNiveau] = mapped_column(
        SQLEnum(
            LangueNiveau,
            name="langue_niveau",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    source: Mapped[SourceOrigine] = mapped_column(
        SQLEnum(
            SourceOrigine,
            name="source_origine",
            values_callable=lambda e: [m.value for m in e],
            create_type=False,
        ),
        nullable=False,
        default=SourceOrigine.LLM,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    professeur = relationship("Professeur", back_populates="langues")
