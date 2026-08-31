from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.demo_sandbox import DemoSandbox  # noqa: F401
    from app.models.professeur import Professeur  # noqa: F401


class UserRole(str, Enum):
    PROF = "prof"
    RH = "rh"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(60), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="userrole"), nullable=False)
    nom_complet: Mapped[str] = mapped_column(String(255), nullable=False)
    actif: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # NULL = compte réel de l'établissement. Non NULL = compte jetable d'un
    # visiteur : c'est le seul axe qui porte des données personnelles, puisque
    # le professeur et son CV pendent du compte.
    sandbox_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("demo_sandboxes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    sandbox: Mapped["DemoSandbox | None"] = relationship("DemoSandbox", back_populates="users")

    professeur: Mapped["Professeur | None"] = relationship(
        "Professeur", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def est_active(self) -> bool:
        """Vrai si l'utilisateur a défini son mot de passe (compte activé).

        Un compte fraîchement créé par l'admin a `password_hash IS NULL` et
        attend l'activation via /api/auth/activate.
        """
        return self.password_hash is not None
