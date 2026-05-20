from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User, UserRole

if TYPE_CHECKING:
    from app.models.competence import Competence  # noqa: F401
    from app.models.experience import Experience  # noqa: F401


class Professeur(Base):
    __tablename__ = "professeurs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
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

    user: Mapped["User"] = relationship("User", back_populates="professeur", uselist=False)
    cv: Mapped["CV | None"] = relationship(
        "CV", back_populates="professeur", uselist=False, cascade="all, delete-orphan"
    )
    competences: Mapped[list["Competence"]] = relationship(
        "Competence",
        back_populates="professeur",
        cascade="all, delete-orphan",
    )
    experiences: Mapped[list["Experience"]] = relationship(
        "Experience",
        back_populates="professeur",
        cascade="all, delete-orphan",
    )


@event.listens_for(User, "after_insert")
def _create_professeur_for_prof_user(mapper, connection, target: User) -> None:
    if target.role == UserRole.PROF:
        connection.execute(
            Professeur.__table__.insert().values(user_id=target.id)
        )
