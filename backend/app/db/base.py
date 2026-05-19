from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import des modèles pour qu'Alembic les détecte via Base.metadata
from app.models.user import User  # noqa: E402, F401

