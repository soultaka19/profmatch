"""Création, cloisonnement et purge des bacs à sable de démonstration.

Le visiteur reçoit **trois comptes** — prof, rh, admin — parce que la valeur du
produit ne se voit qu'en enchaînant les trois rôles : téléverser un CV, générer
les affectations, lire la justification XAI, ajuster les pondérations. Il reçoit
aussi **sa propre session académique**, seul axe de cloisonnement que le domaine
offrait déjà (affectations et pondérations y pendent).

Ce qu'il ne reçoit pas : une copie du référentiel. Programmes, cours et les
professeurs de démonstration restent partagés et **en lecture seule** pour lui
(voir `app/core/deps.py`), sans quoi la génération d'affectations n'aurait aucun
candidat et la démonstration serait vide.
"""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.demo_sandbox import DemoSandbox
from app.models.session import Semestre, Session, SessionStatut
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

# Les sessions d'un bac à sable vivent dans une plage d'années qu'aucun
# établissement réel n'emploiera : la clé naturelle (annee, semestre) est unique
# en base, il faut donc un espace réservé pour ne jamais heurter une session
# réelle. L'automne est toujours actif, quel que soit le rythme du programme.
ANNEE_DEMO_MIN = 2900
ANNEE_DEMO_MAX = 2999

_LIBELLES = {
    UserRole.PROF: "Camille Fortin (professeur)",
    UserRole.RH: "Rachid Belkacem (ressources humaines)",
    UserRole.ADMIN: "Aline Dubé (administration)",
}


async def creer_bac_a_sable(db: AsyncSession, adresse: str) -> dict:
    """Crée un bac à sable et renvoie un jeton par rôle.

    Les trois jetons sont remis d'emblée : changer de rôle ne doit pas demander
    de se reconnecter, sans quoi le visiteur abandonne avant d'avoir vu la
    chaîne complète.
    """
    maintenant = datetime.now(UTC)
    await _verifier_plafonds(db, adresse, maintenant)

    bac = DemoSandbox(
        expire_le=maintenant + timedelta(minutes=settings.DEMO_DUREE_MINUTES),
        adresse_creation=adresse,
        appels_ia=0,
    )
    db.add(bac)
    await db.flush()

    suffixe = secrets.token_hex(4)
    mot_de_passe = hash_password(f"Demo-{secrets.token_hex(8)}")
    jetons: dict[str, str] = {}

    for role in (UserRole.PROF, UserRole.RH, UserRole.ADMIN):
        compte = User(
            email=f"demo-{suffixe}-{role.value}@demo.profmatch",
            password_hash=mot_de_passe,
            role=role,
            nom_complet=_LIBELLES[role],
            actif=True,
            sandbox_id=bac.id,
        )
        db.add(compte)
        # flush par compte : l'événement `after_insert` de User crée le
        # professeur associé au rôle prof, et l'identifiant est nécessaire au
        # jeton.
        await db.flush()
        jetons[role.value] = create_access_token(compte.id, role.value)

    session = Session(
        annee=await _annee_libre(db),
        semestre=Semestre.AUTOMNE,
        statut=SessionStatut.OUVERTE,
        sandbox_id=bac.id,
    )
    db.add(session)
    await db.commit()

    logger.info("Bac a sable %s cree, expire le %s", bac.id, bac.expire_le.isoformat())

    return {
        "sandbox_id": bac.id,
        "jetons": jetons,
        "expire_le": bac.expire_le.isoformat(),
        "session_id": session.id,
        "session_nom": session.nom,
        "appels_ia_total": settings.DEMO_APPELS_IA,
        "appels_ia_restants": settings.DEMO_APPELS_IA,
    }


async def _annee_libre(db: AsyncSession) -> int:
    """Première année de la plage réservée qui n'est pas déjà prise.

    Prises, pas « comptées » : un bac purgé libère son année, et deux bacs
    vivants ne peuvent pas partager la même clé naturelle.
    """
    prises = set(
        (
            await db.execute(
                select(Session.annee).where(
                    Session.annee >= ANNEE_DEMO_MIN,
                    Session.semestre == Semestre.AUTOMNE,
                )
            )
        )
        .scalars()
        .all()
    )
    for annee in range(ANNEE_DEMO_MIN, ANNEE_DEMO_MAX + 1):
        if annee not in prises:
            return annee

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Trop d'espaces de démonstration sont ouverts. Réessayez dans quelques minutes.",
    )


async def _verifier_plafonds(db: AsyncSession, adresse: str, maintenant: datetime) -> None:
    vivants = (
        await db.execute(
            select(func.count()).select_from(DemoSandbox).where(DemoSandbox.expire_le > maintenant)
        )
    ).scalar_one()

    if vivants >= settings.DEMO_MAX_VIVANTS:
        logger.warning("Plafond de bacs vivants atteint (%s)", vivants)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Trop d'espaces de démonstration sont ouverts en ce moment. "
                "Chacun expire au bout d'une heure ; réessayez dans quelques minutes."
            ),
        )

    depuis = maintenant - timedelta(minutes=settings.DEMO_FENETRE_MINUTES)
    recents = (
        await db.execute(
            select(func.count())
            .select_from(DemoSandbox)
            .where(
                DemoSandbox.adresse_creation == adresse,
                DemoSandbox.cree_le > depuis,
            )
        )
    ).scalar_one()

    if recents >= settings.DEMO_LIMITE_CREATIONS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Vous avez ouvert plusieurs espaces de démonstration coup sur coup. "
                "Patientez quelques minutes avant d'en créer un nouveau."
            ),
        )


async def purger_expires(db: AsyncSession) -> int:
    """Efface les bacs à sable arrivés à terme.

    Une seule instruction suffit : les comptes et les sessions pendent du bac en
    `ON DELETE CASCADE`, et les professeurs, CV, compétences, expériences,
    formations, langues, affectations et pondérations pendent eux-mêmes des
    comptes et des sessions. Sans cette boucle, la promesse « jetable » serait
    fausse.
    """
    resultat = await db.execute(
        delete(DemoSandbox).where(DemoSandbox.expire_le <= datetime.now(UTC))
    )
    await db.commit()
    efface = resultat.rowcount or 0
    if efface:
        logger.info("Purge : %s bac(s) a sable efface(s)", efface)
    return efface


async def bac_de(db: AsyncSession, user: User) -> DemoSandbox | None:
    if user.sandbox_id is None:
        return None
    return await db.get(DemoSandbox, user.sandbox_id)
