from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


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
    actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    professeur: Mapped["Professeur | None"] = relationship(
        "Professeur", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
