from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class PasswordSetupToken(Base):
    """Token à usage unique permettant à un utilisateur nouvellement créé
    (ou dont le mot de passe a été réinitialisé) de définir son mot de passe.

    Cycle de vie :
    - Créé par l'admin lors de la création d'un compte ou via /reinit-password
    - Valide pendant 72h (configurable via expires_at)
    - Consommé lors de l'appel à POST /api/auth/activate (used_at est setté)
    - Un token déjà utilisé ou expiré ne peut plus servir.
    """

    __tablename__ = "password_setup_tokens"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User")
