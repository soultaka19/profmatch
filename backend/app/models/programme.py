from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum as SQLEnum, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.session import Semestre

if TYPE_CHECKING:
    from app.models.etape_programme import EtapeProgramme


class Programme(Base):
    """Programme académique (ex. 51046 - Programmation informatique)."""

    __tablename__ = "programmes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nom: Mapped[str] = mapped_column(String(200), nullable=False)
    departement: Mapped[str | None] = mapped_column(String(120), nullable=True)
    semestres_admission: Mapped[list[Semestre]] = mapped_column(
        ARRAY(
            SQLEnum(
                Semestre,
                name="semestre",
                values_callable=lambda e: [m.value for m in e],
                create_type=False,
            )
        ),
        nullable=False,
        server_default=text("ARRAY['automne']::semestre[]"),
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    etapes: Mapped[list["EtapeProgramme"]] = relationship(
        "EtapeProgramme",
        back_populates="programme",
        cascade="all, delete-orphan",
        order_by="EtapeProgramme.ordre",
    )
