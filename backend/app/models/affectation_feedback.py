from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.affectation import Affectation
    from app.models.user import User


class AffectationFeedback(Base):
    """Retour RH sur une affectation validée — alimente le bonus W3 historique.

    Conforme Cahier des charges §2.2 : note 1-5, valide_par (FK users),
    date_eval (création).
    """

    __tablename__ = "affectation_feedback"
    __table_args__ = (
        CheckConstraint("note BETWEEN 1 AND 5", name="ck_feedback_note_1_5"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    affectation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("affectations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    commentaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    valide_par_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    date_eval: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    affectation: Mapped["Affectation"] = relationship(
        "Affectation", back_populates="feedbacks"
    )
    valide_par: Mapped["User | None"] = relationship("User")
