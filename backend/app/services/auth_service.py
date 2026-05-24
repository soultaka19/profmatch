from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User


class AccountNotActivatedError(Exception):
    """L'utilisateur existe et est actif mais n'a pas encore défini son mot de passe.

    Doit être traduit en HTTP 403 par le router avec un message explicite invitant
    l'utilisateur à utiliser son lien d'activation.
    """


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    """Retourne l'utilisateur si email/mot de passe valides et compte actif, sinon None.

    Lève AccountNotActivatedError si le compte existe mais n'a pas encore de
    mot de passe défini (workflow d'invitation par l'admin).
    """
    result = await db.execute(select(User).where(User.email == email, User.actif.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if user.password_hash is None:
        raise AccountNotActivatedError(email)
    if not verify_password(password, user.password_hash):
        return None
    return user
