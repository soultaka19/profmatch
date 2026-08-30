"""Service de détail enrichi d'une affectation (wireframe 'Match compétences').

À partir d'un `affectation_id`, rassemble en une réponse les données dont
le frontend a besoin pour afficher le panneau de justification : matching
compétences requises ↔ maîtrisées, années d'expérience, historique RH,
similarité sémantique. Toutes les requêtes sont groupées en début pour
limiter les allers-retours DB."""

from __future__ import annotations

import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.affectation import Affectation, AffectationStatut
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.experience import Experience
from app.models.professeur import Professeur
from app.schemas.affectation import (
    CompetenceRequiseOut,
    JustificationDetailOut,
)
from app.services.embeddings import cosine_similarity


async def _annees_experience(db: AsyncSession, professeur_id: int) -> int:
    """Somme des durées d'expérience, avec année courante en remplacement
    si `annee_fin` est NULL. Aligné sur `_scorer_paire` pour la cohérence."""
    rows = (
        await db.execute(
            select(Experience.annee_debut, Experience.annee_fin).where(
                Experience.professeur_id == professeur_id
            )
        )
    ).all()
    if not rows:
        return 0
    annee_courante = datetime.date.today().year
    total = sum((fin or annee_courante) - debut for debut, fin in rows if debut is not None)
    return max(0, int(total))


async def _historique_paire(
    db: AsyncSession, professeur_id: int, cours_id: int, session_id_exclue: int
) -> tuple[int, float]:
    """Nb sessions validées et note RH moyenne pour la paire (prof, cours)
    hors session courante. Une seule requête agrégée. Retourne `(0, 0.0)`
    si aucun feedback noté."""
    row = (
        await db.execute(
            select(
                func.count(func.distinct(Affectation.id)),
                func.avg(AffectationFeedback.note),
            )
            .join(AffectationFeedback, AffectationFeedback.affectation_id == Affectation.id)
            .where(
                Affectation.professeur_id == professeur_id,
                Affectation.cours_id == cours_id,
                Affectation.session_id != session_id_exclue,
                Affectation.statut == AffectationStatut.VALIDEE,
            )
        )
    ).one()
    nb, moyenne = row
    return int(nb or 0), float(moyenne or 0.0)


async def get_justification_detail(affectation_id: int, db: AsyncSession) -> JustificationDetailOut:
    """Charge le détail wireframe B d'une affectation. Lève `ValueError` si
    introuvable. Le matching compétences est insensible à la casse."""
    aff = (
        await db.execute(
            select(Affectation)
            .where(Affectation.id == affectation_id)
            .options(
                selectinload(Affectation.cours),
                selectinload(Affectation.professeur).selectinload(Professeur.user),
                selectinload(Affectation.professeur).selectinload(Professeur.competences),
            )
        )
    ).scalar_one_or_none()
    if aff is None:
        raise ValueError(f"Affectation {affectation_id} introuvable")

    competences_prof = [c.nom for c in aff.professeur.competences]
    competences_prof_lower = {c.lower() for c in competences_prof}

    ccs = (
        (await db.execute(select(CoursCompetence).where(CoursCompetence.cours_id == aff.cours_id)))
        .scalars()
        .all()
    )
    competences_requises = [
        CompetenceRequiseOut(
            nom=cc.nom,
            importance=cc.importance,
            couverte=cc.nom.lower() in competences_prof_lower,
        )
        for cc in ccs
    ]

    annees_exp = await _annees_experience(db, aff.professeur_id)
    nb_sessions, note_moy = await _historique_paire(
        db, aff.professeur_id, aff.cours_id, aff.session_id
    )

    # Similarité sémantique brute (non pondérée) — calcul on-the-fly depuis
    # les embeddings, identique à _scorer_paire. Retourne 0.0 si embedding
    # manquant côté prof OU cours (cas legacy non backfillé).
    cours = await db.get(Cours, aff.cours_id)
    sim = 0.0
    if cours is not None and aff.professeur.embedding and cours.embedding:
        sim = cosine_similarity(aff.professeur.embedding, cours.embedding)

    return JustificationDetailOut(
        affectation_id=aff.id,
        score_total=float(aff.score_total),
        score_comp=float(aff.score_comp),
        score_exp=float(aff.score_exp),
        score_hist=float(aff.score_hist),
        score_sem=float(aff.score_sem),
        similarite_semantique=sim,
        annees_experience=annees_exp,
        nb_sessions_precedentes=nb_sessions,
        note_rh_moyenne=note_moy,
        competences_requises=competences_requises,
        competences_maitrisees=sorted(competences_prof, key=str.lower),
        justification=aff.justification,
        justification_statut=aff.justification_statut,
        nom_professeur=(
            aff.professeur.user.nom_complet
            if aff.professeur.user is not None
            else f"Prof #{aff.professeur_id}"
        ),
        code_cours=aff.cours.code if aff.cours is not None else "",
        titre_cours=aff.cours.nom if aff.cours is not None else "",
    )
