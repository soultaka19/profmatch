from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.competence import SourceOrigine


class Formation(Base):
    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    diplome: Mapped[str] = mapped_column(String(255), nullable=False)
    etablissement: Mapped[str] = mapped_column(String(255), nullable=False)
    annee: Mapped[int] = mapped_column(Integer, nullable=False)
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

    professeur = relationship("Professeur", back_populates="formations")
