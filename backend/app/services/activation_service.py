"""Service de gestion des jetons d'activation de mot de passe.

Un jeton est émis par l'admin lors de la création d'un compte (ou via
reinit-password). L'utilisateur l'utilise pour définir son mot de passe via
POST /api/auth/activate.

Règles :
- TTL par défaut : 72 heures.
- Usage unique : `used_at` est setté à la première activation réussie.
- Un compte ne peut avoir qu'un seul token actif à la fois ; les anciens
  tokens non utilisés sont invalidés (used_at = now) lors d'une nouvelle
  émission, pour éviter qu'un token oublié reste valide.
"""

from __future__ import annotations

import datetime
import secrets

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.password_setup_token import PasswordSetupToken
from app.models.user import User

TOKEN_TTL_HOURS: int = 72


class ActivationError(Exception):
    """Erreur fonctionnelle d'activation (token invalide, expiré, déjà utilisé)."""


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


async def generate_setup_token(user_id: int, db: AsyncSession) -> str:
    """Émet un nouveau jeton d'activation pour l'utilisateur.

    Invalide tous les jetons non utilisés précédents du même utilisateur.
    Retourne le token brut (à transmettre une seule fois — il ne sera plus
    récupérable par la suite).
    """
    # Invalider les tokens non utilisés du même user
    await db.execute(
        update(PasswordSetupToken)
        .where(
            PasswordSetupToken.user_id == user_id,
            PasswordSetupToken.used_at.is_(None),
        )
        .values(used_at=_now())
    )

    token_brut = secrets.token_urlsafe(32)[:64]
    expires_at = _now() + datetime.timedelta(hours=TOKEN_TTL_HOURS)

    db_token = PasswordSetupToken(
        token=token_brut,
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(db_token)
    await db.commit()
    return token_brut


async def activate_with_token(token: str, new_password: str, db: AsyncSession) -> User:
    """Active un compte en consommant le jeton et en définissant le mot de passe.

    Lève ActivationError si :
    - le token n'existe pas
    - le token est expiré (expires_at < maintenant)
    - le token a déjà été utilisé (used_at non null)
    """
    result = await db.execute(select(PasswordSetupToken).where(PasswordSetupToken.token == token))
    db_token = result.scalar_one_or_none()
    if db_token is None:
        raise ActivationError("Jeton d'activation introuvable")

    now = _now()
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)

    if db_token.used_at is not None:
        raise ActivationError("Jeton déjà utilisé")
    if expires_at < now:
        raise ActivationError("Jeton expiré")

    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise ActivationError("Utilisateur introuvable")

    user.password_hash = hash_password(new_password)
    db_token.used_at = now
    await db.commit()
    await db.refresh(user)
    return user
