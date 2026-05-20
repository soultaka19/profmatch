from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, DateTime, Enum as SQLEnum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SourceOrigine(str, Enum):
    LLM = "llm"
    MANUAL = "manual"


class CompetenceNiveau(str, Enum):
    DEBUTANT = "debutant"
    INTERMEDIAIRE = "intermediaire"
    AVANCE = "avance"
    EXPERT = "expert"


class Competence(Base):
    __tablename__ = "competences"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nom: Mapped[str] = mapped_column(String(120), nullable=False)
    niveau: Mapped[CompetenceNiveau] = mapped_column(
        SQLEnum(
            CompetenceNiveau,
            name="competence_niveau",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    source: Mapped[SourceOrigine] = mapped_column(
        SQLEnum(
            SourceOrigine,
            name="source_origine",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=SourceOrigine.LLM,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    professeur = relationship("Professeur", back_populates="competences")
