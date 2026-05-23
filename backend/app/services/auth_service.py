from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    """Retourne l'utilisateur si email/mot de passe valides et compte actif, sinon None."""
    result = await db.execute(select(User).where(User.email == email, User.actif.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
