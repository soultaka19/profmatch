"""Cloisonnement et budget des bacs à sable de démonstration.

Trois règles, chacune tenue à un seul endroit :

1. **Visibilité** — ce qui porte des données personnelles (comptes, donc
   professeurs et CV) et ce que le visiteur produit (sessions) n'est visible que
   depuis son propre bac. Le référentiel partagé (`sandbox_id IS NULL`) reste
   visible de tous, sans quoi la démonstration serait vide.
2. **Écriture** — le référentiel partagé est en lecture seule pour un visiteur :
   il est commun à tous, un visiteur ne doit pas pouvoir l'abîmer pour le suivant.
3. **Budget** — les appels au modèle sont comptés par bac et par jour.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.demo_sandbox import DemoQuotaJour, DemoSandbox
from app.models.user import User

MESSAGE_LECTURE_SEULE = (
    "Le référentiel (programmes, cours, compétences) est partagé par tous les "
    "visiteurs : il est en lecture seule pendant la démonstration. Vous pouvez "
    "en revanche créer votre session, générer vos affectations et ajuster les "
    "pondérations — c'est votre espace."
)

MESSAGE_QUOTA_BAC = (
    "Vous avez utilisé vos {n} appels à l'assistant. Les affectations et les "
    "justifications déjà produites restent consultables, et un nouvel espace de "
    "démonstration vous en redonnera autant."
)

MESSAGE_QUOTA_JOUR = (
    "Le budget quotidien de la démonstration est atteint. Les analyses déjà "
    "produites restent consultables ; réessayez demain."
)


def portee_sandbox(colonne_sandbox, sandbox_id: int | None) -> ColumnElement[bool]:
    """Condition de visibilité pour une table portant `sandbox_id`.

    Le réel ne voit que le réel. Un bac à sable voit le réel **et** lui-même —
    il a besoin du référentiel partagé pour que la génération d'affectations
    ait des candidats.

    Prend l'identifiant et non l'utilisateur : la tâche Celery de génération
    dérive la portée de la **session** traitée, sans utilisateur sous la main.
    """
    if sandbox_id is None:
        return colonne_sandbox.is_(None)
    return or_(colonne_sandbox.is_(None), colonne_sandbox == sandbox_id)


def visibilite(colonne_sandbox, user: User) -> ColumnElement[bool]:
    """Portée de lecture de l'utilisateur courant."""
    return portee_sandbox(colonne_sandbox, user.sandbox_id)


async def referentiel_en_lecture_seule(
    request: Request,
    user: User = Depends(get_current_user),
) -> None:
    """Refuse à un visiteur toute écriture sur le référentiel partagé.

    Posée sur le **routeur entier** au montage, pas route par route : le
    recensement manuel est ce qui a déjà coûté cher sur ce projet (deux chemins
    oubliés lors de la correction du slash final). Ici, une route ajoutée
    demain est couverte sans que personne ait à y penser.
    """
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    if user.sandbox_id is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MESSAGE_LECTURE_SEULE)


def possession(colonne_sandbox, user: User) -> ColumnElement[bool]:
    """Condition d'**écriture** : ne modifie que ce qui t'appartient.

    Voir n'est pas écrire. Un visiteur voit les sessions de l'établissement —
    il en a besoin pour comprendre le produit — mais il ne doit pas pouvoir en
    changer le statut, les pondérations, ni les supprimer.
    """
    if user.sandbox_id is None:
        return colonne_sandbox.is_(None)
    return colonne_sandbox == user.sandbox_id


async def session_visible_ou_404(db: AsyncSession, session_id: int, user: User):
    """Charge une session académique visible par l'utilisateur, ou lève 404.

    404 et non 403 : l'existence d'une session appartenant à un autre bac à
    sable ne doit pas être révélée. Toutes les routes portant un `session_id`
    passent par ici — pondérations comprises, sinon un visiteur pourrait
    réécrire les pondérations de l'établissement.
    """
    from app.models.session import Session

    sess = (
        await db.execute(
            select(Session).where(
                Session.id == session_id,
                visibilite(Session.sandbox_id, user),
            )
        )
    ).scalar_one_or_none()

    if sess is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable")
    return sess


async def session_modifiable_ou_404(db: AsyncSession, session_id: int, user: User):
    """Comme `session_visible_ou_404`, mais pour une écriture.

    Un visiteur ne peut modifier que sa propre session. 404 plutôt que 403 :
    du point de vue de son espace, la session de l'établissement n'est pas la
    sienne à modifier, et le message n'a pas à distinguer les deux cas.
    """
    from app.models.session import Session

    sess = (
        await db.execute(
            select(Session).where(
                Session.id == session_id,
                possession(Session.sandbox_id, user),
            )
        )
    ).scalar_one_or_none()

    if sess is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable")
    return sess


async def affectation_visible_ou_404(
    db: AsyncSession, affectation_id: int, user: User, ecriture: bool = False
):
    """Charge une affectation dont la session est visible (ou modifiable).

    Une affectation ne porte pas de `sandbox_id` : elle pend d'une session, qui
    en porte un. Le cloisonnement se lit donc par jointure — un axe unique, qui
    ne peut pas diverger de celui des sessions.
    """
    from app.models.affectation import Affectation
    from app.models.session import Session

    portee = (
        possession(Session.sandbox_id, user) if ecriture else visibilite(Session.sandbox_id, user)
    )
    aff = (
        await db.execute(
            select(Affectation)
            .join(Session, Affectation.session_id == Session.id)
            .where(Affectation.id == affectation_id, portee)
        )
    ).scalar_one_or_none()

    if aff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affectation introuvable")
    return aff


async def consommer_appel_ia(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Dépendance de route : décompte un appel au modèle, ou refuse (429)."""
    if not await tenter_appel_ia(db, user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_refus_budget(await _appels_du_jour(db, datetime.now(UTC).date())),
        )


def _refus_budget(appels_jour: int) -> str:
    if appels_jour >= settings.DEMO_APPELS_IA_PAR_JOUR:
        return MESSAGE_QUOTA_JOUR
    return MESSAGE_QUOTA_BAC.format(n=settings.DEMO_APPELS_IA)


async def tenter_appel_ia(db: AsyncSession, user: User) -> bool:
    """Décompte un appel au modèle pour un visiteur. Renvoie False si refusé.

    Renvoie un booléen plutôt que de lever : l'enrichissement XAI est **lazy**,
    déclenché par une simple consultation. Un quota épuisé doit y faire retomber
    la justification statique — déjà prévue par le produit — et non casser
    l'affichage du panneau.

    Sans effet pour un compte réel : la facture est celle de l'établissement,
    pas celle de la démonstration.

    Le plafond quotidien global ne dépend d'aucun en-tête : il tient encore si
    la limite par adresse IP est contournée sur le domaine de l'API.
    """
    if user.sandbox_id is None:
        return True

    bac = await db.get(DemoSandbox, user.sandbox_id)
    if bac is None:
        return True

    if bac.appels_ia >= settings.DEMO_APPELS_IA:
        return False

    jour = datetime.now(UTC).date()
    if await _appels_du_jour(db, jour) >= settings.DEMO_APPELS_IA_PAR_JOUR:
        return False

    bac.appels_ia += 1
    await _incrementer_jour(db, jour)
    await db.commit()
    return True


async def appels_restants(db: AsyncSession, user: User) -> int | None:
    """Appels encore accordés au bac du visiteur ; None pour un compte réel."""
    if user.sandbox_id is None:
        return None
    bac = await db.get(DemoSandbox, user.sandbox_id)
    if bac is None:
        return None
    return max(0, settings.DEMO_APPELS_IA - bac.appels_ia)


async def _appels_du_jour(db: AsyncSession, jour: date) -> int:
    ligne = (
        await db.execute(select(DemoQuotaJour.appels).where(DemoQuotaJour.jour == jour))
    ).scalar_one_or_none()
    return int(ligne or 0)


async def _incrementer_jour(db: AsyncSession, jour: date) -> None:
    """Incrémente le compteur du jour en une instruction.

    `ON CONFLICT DO UPDATE` plutôt qu'un `SELECT` puis un `INSERT` : deux
    visiteurs simultanés le premier appel du jour ne doivent pas se marcher
    dessus.
    """
    await db.execute(
        pg_insert(DemoQuotaJour)
        .values(jour=jour, appels=1)
        .on_conflict_do_update(
            index_elements=[DemoQuotaJour.jour],
            set_={"appels": DemoQuotaJour.appels + 1},
        )
    )
