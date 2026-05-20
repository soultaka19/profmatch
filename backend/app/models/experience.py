from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.competence import SourceOrigine


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    poste: Mapped[str] = mapped_column(String(255), nullable=False)
    employeur: Mapped[str] = mapped_column(String(255), nullable=False)
    annee_debut: Mapped[int] = mapped_column(Integer, nullable=False)
    annee_fin: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description_courte: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    ordre: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    professeur = relationship("Professeur", back_populates="experiences")
