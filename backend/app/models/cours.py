from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Float, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours_etape_programme import CoursEtapeProgramme


class Cours(Base):
    """Cours académique — référencé globalement par son code unique.

    Un cours appartient à un (ou plusieurs) programme(s) via la table
    cours_etape_programme, qui définit aussi son étape et sa catégorie.
    Il est offert dans une session via les affectations.
    """

    __tablename__ = "cours"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    nom: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    credits: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    heures: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    liens_cursus: Mapped[list["CoursEtapeProgramme"]] = relationship(
        "CoursEtapeProgramme",
        back_populates="cours",
        cascade="all, delete-orphan",
    )
