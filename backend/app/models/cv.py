from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CVStatut(str, Enum):
    EN_ATTENTE = "en_attente"
    EN_COURS = "en_cours"
    TRAITE = "traite"
    ERREUR = "erreur"


class CV(Base):
    __tablename__ = "cvs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    professeur_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("professeurs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    nom_original: Mapped[str] = mapped_column(String(255), nullable=False)
    chemin_fichier: Mapped[str] = mapped_column(String(512), nullable=False)
    taille_octets: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    statut: Mapped[CVStatut] = mapped_column(
        SQLEnum(
            CVStatut,
            name="cvstatut",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=CVStatut.EN_ATTENTE,
        index=True,
    )
    texte_brut: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_erreur: Mapped[str | None] = mapped_column(Text, nullable=True)
    televerse_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    traite_le: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    professeur: Mapped["Professeur"] = relationship("Professeur", back_populates="cv")
