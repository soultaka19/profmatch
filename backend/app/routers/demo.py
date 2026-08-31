"""Porte d'entrée de la démonstration publique.

Préfixe monté dans `main.py` : `/api/demo`. Les chemins sont déclarés sans
slash final — ProfMatch a déjà payé ce piège : derrière Vercel, un chemin
canonique en `/` provoque une redirection qui change d'origine, et tout client
HTTP correct retire alors l'en-tête `Authorization`.
"""

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.client_ip import adresse_visiteur
from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.demo_service import bac_de, creer_bac_a_sable

router = APIRouter()


class BacASableOut(BaseModel):
    """Tout ce qu'il faut au front pour entrer et pour informer le visiteur."""

    sandbox_id: int
    # Un jeton par rôle : changer de rôle ne doit pas demander de se reconnecter.
    jetons: dict[str, str]
    expire_le: str
    session_id: int
    session_nom: str
    appels_ia_total: int
    appels_ia_restants: int


class StatutOut(BaseModel):
    est_demo: bool
    expire_le: str | None = None
    appels_ia_total: int | None = None
    appels_ia_restants: int | None = None


@router.post("/sandbox", response_model=BacASableOut, status_code=status.HTTP_201_CREATED)
async def creer(request: Request, db: AsyncSession = Depends(get_db)) -> BacASableOut:
    """Crée un espace de démonstration jetable.

    Aucune garde : c'est précisément le point d'entrée de quelqu'un qui n'a pas
    de compte. Rien ne lui est demandé — ni adresse courriel, ni mot de passe.
    """
    return BacASableOut(**await creer_bac_a_sable(db, adresse_visiteur(request)))


@router.get("/status", response_model=StatutOut)
async def statut(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatutOut:
    """État du bac courant : expiration et appels au modèle restants.

    Renvoie `est_demo: false` pour un compte réel, qui n'est soumis à aucun
    budget — la facture est celle de l'établissement.
    """
    bac = await bac_de(db, current_user)
    if bac is None:
        return StatutOut(est_demo=False)

    return StatutOut(
        est_demo=True,
        expire_le=bac.expire_le.isoformat(),
        appels_ia_total=settings.DEMO_APPELS_IA,
        appels_ia_restants=max(0, settings.DEMO_APPELS_IA - bac.appels_ia),
    )
