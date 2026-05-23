from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours import Cours
    from app.models.etape_programme import EtapeProgramme
    from app.models.programme import Programme


class CategorieCours(str, Enum):
    OBLIGATOIRE = "obligatoire"
    CHOIX_FRANCAIS = "choix_francais"
    CHOIX_ANGLAIS = "choix_anglais"


class CoursEtapeProgramme(Base):
    """Lien cursus : un cours apparaît dans une étape d'un programme avec une catégorie."""

    __tablename__ = "cours_etape_programme"
    __table_args__ = (
        UniqueConstraint(
            "programme_id",
            "etape_id",
            "cours_id",
            name="uq_cursus_programme_etape_cours",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    programme_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("programmes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    etape_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("etapes_programme.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cours_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cours.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    categorie: Mapped[CategorieCours] = mapped_column(
        SQLEnum(
            CategorieCours,
            name="categorie_cours",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=CategorieCours.OBLIGATOIRE,
        server_default=CategorieCours.OBLIGATOIRE.value,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    programme: Mapped["Programme"] = relationship("Programme")
    etape: Mapped["EtapeProgramme"] = relationship("EtapeProgramme")
    cours: Mapped["Cours"] = relationship("Cours", back_populates="liens_cursus")
