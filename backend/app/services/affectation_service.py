"""Orchestrateur de génération des affectations professeur-cours.

Flux :
1. Charger PonderationsSession → PoidsScoring
2. Charger les cours des programmes sélectionnés avec leurs compétences
3. Charger les professeurs avec CV traité + compétences + expériences + embedding
4. Pour chaque paire (prof, cours) :
   - W1 : score_competences pondéré par importance
   - W2 : score_experience (années totales normalisées)
   - W3 : bonus_historique (feedbacks sessions précédentes)
   - W4 : similarité cosinus embeddings
5. Conserver le top 3 par cours (minimum exigé par le Cahier des charges)
6. Persister les Affectation avec statut=PROPOSEE et justification statique
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.affectation import (
    Affectation,
    AffectationOrigine,
    AffectationStatut,
    JustificationStatut,
)
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.cours_etape_programme import CoursEtapeProgramme
from app.models.ponderations_session import PonderationsSession
from app.models.professeur import Professeur
from app.models.programme import Programme
from app.models.session import Session
from app.services.academic_calendar import programme_actif_pour_session
from app.services.affectation_xai import generer_justification_llm
from app.services.embeddings import cosine_similarity
from app.services.scoring import (
    ContexteJustification,
    PoidsScoring,
    ScoresComposants,
    calculer_score_composite,
    generer_justification_statique,
    score_experience,
    score_historique,
    score_semantique,
)


def _ctx_to_dict(ctx: ContexteJustification) -> dict:
    """Sérialise un ContexteJustification pour le passer en argument Celery
    (JSON-compatible). Les Decimal deviennent des float, tout le reste passe
    nativement. La désérialisation symétrique vit dans `affectation_enrichissement`."""
    return {
        "nom_professeur": ctx.nom_professeur,
        "code_cours": ctx.code_cours,
        "titre_cours": ctx.titre_cours,
        "nb_comp_couvertes": ctx.nb_comp_couvertes,
        "nb_comp_requises": ctx.nb_comp_requises,
        "competences_maitrisees": list(ctx.competences_maitrisees),
        "annees_experience": ctx.annees_experience,
        "nb_sessions_precedentes": ctx.nb_sessions_precedentes,
        "note_rh_moyenne": float(ctx.note_rh_moyenne),
        "similarite_semantique": float(ctx.similarite_semantique),
        "score_global_pct": float(ctx.score_global_pct),
        "poids": {
            "w1": float(ctx.poids.w1), "w2": float(ctx.poids.w2),
            "w3": float(ctx.poids.w3), "w4": float(ctx.poids.w4),
        },
        "composants": {
            "score_comp": float(ctx.composants.score_comp),
            "score_exp": float(ctx.composants.score_exp),
            "score_hist": float(ctx.composants.score_hist),
            "score_sem": float(ctx.composants.score_sem),
        },
    }


def _enqueue_enrichissement(affectation_id: int, ctx_dict: dict) -> None:
    """Lance la tâche Celery d'enrichissement narration LLM.

    Isolée dans une fonction module-level pour pouvoir être monkeypatchée par
    les tests sans avoir à toucher au broker Celery. L'import de la tâche est
    différé pour ne pas créer de cycle module↔tasks au chargement."""
    from app.tasks.affectation_tasks import enrichir_justification_xai_task
    enrichir_justification_xai_task.delay(affectation_id, ctx_dict)

TOP_N_PAR_COURS: int = 3


async def _charger_ponderations(session_id: int, db: AsyncSession) -> tuple[PoidsScoring, bool]:
    """Retourne les poids W1–W4 et le flag `xai_actif` (justification LLM vs statique)."""
    result = await db.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == session_id)
    )
    pond = result.scalar_one_or_none()
    if pond is None:
        raise ValueError(f"Aucune pondération trouvée pour session_id={session_id}")
    poids = PoidsScoring(w1=pond.w1, w2=pond.w2, w3=pond.w3, w4=pond.w4)
    return poids, pond.xai_actif


async def _rediger_justification(ctx: ContexteJustification, xai_actif: bool) -> str:
    """Justification narrative XAI par LLM si activée, sinon version statique.

    L'appel LLM (réseau, synchrone) est déporté hors de l'event loop. La
    fonction LLM intègre déjà un repli statique en cas d'échec.
    """
    if xai_actif:
        return await asyncio.to_thread(generer_justification_llm, ctx)
    return generer_justification_statique(ctx)


async def _charger_cours_par_programmes(
    programme_ids: list[int],
    db: AsyncSession,
    etape_ids: list[int] | None = None,
) -> list[Cours]:
    query = (
        select(Cours)
        .join(CoursEtapeProgramme, CoursEtapeProgramme.cours_id == Cours.id)
        .where(CoursEtapeProgramme.programme_id.in_(programme_ids))
        .options(selectinload(Cours.liens_cursus))
        .distinct()
    )
    if etape_ids:
        query = query.where(CoursEtapeProgramme.etape_id.in_(etape_ids))
    result = await db.execute(query)
    return list(result.scalars().all())


async def _charger_competences_cours(cours_ids: list[int], db: AsyncSession) -> dict[int, list[CoursCompetence]]:
    result = await db.execute(
        select(CoursCompetence).where(CoursCompetence.cours_id.in_(cours_ids))
    )
    competences = result.scalars().all()
    mapping: dict[int, list[CoursCompetence]] = {}
    for cc in competences:
        mapping.setdefault(cc.cours_id, []).append(cc)
    return mapping


async def _charger_professeurs_traites(db: AsyncSession) -> list[Professeur]:
    from app.models.competence import Competence
    from app.models.cv import CV, CVStatut
    from app.models.experience import Experience

    result = await db.execute(
        select(Professeur)
        .join(CV, CV.professeur_id == Professeur.id)
        .where(CV.statut == CVStatut.TRAITE)
        .options(
            selectinload(Professeur.user),
            selectinload(Professeur.competences),
            selectinload(Professeur.experiences),
        )
    )
    return list(result.scalars().all())


async def _charger_bonus_historique(
    session_id: int, db: AsyncSession
) -> dict[tuple[int, int], tuple[float, int, float]]:
    """Précharge en UNE requête le bonus W3 de toutes les paires (prof, cours)
    ayant un historique validé et noté hors de la session courante.

    Retourne {(professeur_id, cours_id): (bonus_normalisé, nb_sessions, note_moy)}.
    Remplace l'appel par paire qui générait N×M requêtes lors de la génération.
    """
    rows = (await db.execute(
        select(
            Affectation.professeur_id,
            Affectation.cours_id,
            func.count(AffectationFeedback.id),
            func.avg(AffectationFeedback.note),
        )
        .join(AffectationFeedback, AffectationFeedback.affectation_id == Affectation.id)
        .where(
            Affectation.statut == AffectationStatut.VALIDEE,
            Affectation.session_id != session_id,
        )
        .group_by(Affectation.professeur_id, Affectation.cours_id)
    )).all()

    bonus_map: dict[tuple[int, int], tuple[float, int, float]] = {}
    for prof_id, cours_id, nb_validees, note_moy in rows:
        if not nb_validees or note_moy is None:
            continue
        # Normalise sur [0, 1] : note_moy ∈ [1,5], on divise par 5
        bonus = min(1.0, float(nb_validees) * float(note_moy) / (5.0 * max(nb_validees, 1)))
        bonus_map[(prof_id, cours_id)] = (bonus, int(nb_validees), float(note_moy))
    return bonus_map


def _score_comp_pondere(
    competences_prof: set[str],
    competences_cours: list[CoursCompetence],
) -> Decimal:
    """W1 pondéré par l'importance de chaque compétence requise.

    Score = Σ importance_i × (1 si prof maîtrise) / Σ importance_i
    """
    if not competences_cours:
        return Decimal("0")
    total_importance = sum(cc.importance for cc in competences_cours)
    if total_importance == 0:
        return Decimal("0")
    score_pondere = sum(
        cc.importance for cc in competences_cours if cc.nom.lower() in {c.lower() for c in competences_prof}
    )
    return Decimal(str(score_pondere / total_importance))


def _scorer_paire(
    prof: Professeur,
    cours: Cours,
    competences_cours: list[CoursCompetence],
    poids: PoidsScoring,
    bonus_map: dict[tuple[int, int], tuple[float, int, float]],
) -> tuple[Decimal, ScoresComposants, ContexteJustification]:
    """Calcule (score_total, composants W1–W4, contexte de justification) pour un
    couple (prof, cours). Fonction de calcul PURE : aucune I/O — le bonus W3
    historique est fourni via `bonus_map` (préchargé par
    `_charger_bonus_historique`). Le prof doit avoir competences/experiences/
    user/embedding chargés. La rédaction de la justification (LLM ou statique)
    est laissée à l'appelant via `_rediger_justification`."""
    from datetime import date as _date

    competences_prof = {c.nom for c in prof.competences}
    sc_comp = _score_comp_pondere(competences_prof, competences_cours)

    annee_courante = _date.today().year
    annees_exp = sum(
        ((exp.annee_fin or annee_courante) - exp.annee_debut)
        for exp in prof.experiences
    ) if prof.experiences else 0
    annees_exp = max(0, annees_exp)
    sc_exp = score_experience(float(annees_exp))

    bonus_hist, nb_sessions_hist, note_moy_hist = bonus_map.get(
        (prof.id, cours.id), (0.0, 0, 0.0)
    )
    sc_hist = score_historique(bonus_hist)

    sim = 0.0
    if prof.embedding and cours.embedding:
        sim = cosine_similarity(prof.embedding, cours.embedding)
    sc_sem = score_semantique(sim)

    composants = ScoresComposants(
        score_comp=sc_comp,
        score_exp=sc_exp,
        score_hist=sc_hist,
        score_sem=sc_sem,
    )
    score_total = calculer_score_composite(poids, sc_comp, sc_exp, sc_hist, sc_sem)

    nb_comp_couvertes = sum(
        1 for cc in competences_cours
        if cc.nom.lower() in {c.lower() for c in competences_prof}
    )
    ctx = ContexteJustification(
        nom_professeur=prof.user.nom_complet if prof.user else f"Prof {prof.id}",
        code_cours=cours.code,
        titre_cours=cours.nom,
        nb_comp_couvertes=nb_comp_couvertes,
        nb_comp_requises=len(competences_cours),
        competences_maitrisees=sorted(competences_prof)[:5],
        annees_experience=int(annees_exp),
        nb_sessions_precedentes=nb_sessions_hist,
        note_rh_moyenne=note_moy_hist,
        similarite_semantique=sim,
        score_global_pct=float(score_total) * 100,
        poids=poids,
        composants=composants,
    )
    return score_total, composants, ctx


async def generer_affectations(
    session_id: int,
    programme_ids: list[int],
    db: AsyncSession,
    etape_ids: list[int] | None = None,
) -> tuple[list[Affectation], list[int]]:
    """Génère et persiste le top-3 d'affectations pour chaque cours des programmes éligibles.

    Supprime les propositions PROPOSEE existantes du périmètre avant de regénérer.
    Les décisions déjà prises persistent : un cours déjà couvert par une VALIDEE est
    sauté et tout prof déjà décidé (VALIDEE/REJETEE) est exclu du vivier du cours —
    ce qui respecte les rejets et évite toute collision sur l'unicité
    (session, prof, cours).
    Retourne (affectations, programmes_exclus_ids).
    """
    poids, xai_actif = await _charger_ponderations(session_id, db)

    sess_result = await db.execute(select(Session).where(Session.id == session_id))
    session = sess_result.scalar_one_or_none()
    if session is None:
        return [], list(programme_ids)

    progs_result = await db.execute(
        select(Programme).where(Programme.id.in_(programme_ids))
    )
    progs = list(progs_result.scalars().all())
    eligibles = [p for p in progs if programme_actif_pour_session(p, session)]
    exclus_ids = [p.id for p in progs if not programme_actif_pour_session(p, session)]

    if not eligibles:
        return [], exclus_ids

    eligible_ids = [p.id for p in eligibles]
    cours_list = await _charger_cours_par_programmes(eligible_ids, db, etape_ids)
    if not cours_list:
        return [], exclus_ids

    cours_ids = [c.id for c in cours_list]
    competences_par_cours = await _charger_competences_cours(cours_ids, db)
    professeurs = await _charger_professeurs_traites(db)
    if not professeurs:
        return [], exclus_ids

    # Préchargement du bonus W3 en une requête (évite le N×M de l'appel par paire).
    bonus_map = await _charger_bonus_historique(session_id, db)

    # Supprimer les PROPOSEE existantes UNIQUEMENT pour les cours du périmètre généré
    if cours_ids:
        existing = await db.execute(
            select(Affectation).where(
                Affectation.session_id == session_id,
                Affectation.statut == AffectationStatut.PROPOSEE,
                Affectation.cours_id.in_(cours_ids),
            )
        )
        for aff in existing.scalars().all():
            await db.delete(aff)
        await db.flush()

    # Décisions déjà prises (VALIDEE/REJETEE) sur le périmètre : elles persistent
    # et la contrainte uq_affectation_session_prof_cours interdit de recréer une
    # PROPOSEE sur le même triplet. On saute donc les cours déjà couverts par une
    # VALIDEE et on retire du vivier tout prof déjà décidé pour un cours.
    cours_couverts: set[int] = set()
    profs_decides_par_cours: dict[int, set[int]] = {}
    if cours_ids:
        decidees = await db.execute(
            select(
                Affectation.cours_id,
                Affectation.professeur_id,
                Affectation.statut,
            ).where(
                Affectation.session_id == session_id,
                Affectation.statut != AffectationStatut.PROPOSEE,
                Affectation.cours_id.in_(cours_ids),
            )
        )
        for cid, pid, statut in decidees.all():
            profs_decides_par_cours.setdefault(cid, set()).add(pid)
            if statut == AffectationStatut.VALIDEE:
                cours_couverts.add(cid)

    # Phase 1 — scoring pur + sélection du top-3 par cours (sans I/O)
    top_par_cours: list[tuple[Affectation, ContexteJustification]] = []
    for cours in cours_list:
        if cours.id in cours_couverts:
            continue  # cours déjà couvert par une VALIDEE → pas de re-proposition
        profs_exclus = profs_decides_par_cours.get(cours.id, set())
        competences_cours = competences_par_cours.get(cours.id, [])
        scores_par_prof: list[tuple[float, Affectation, ContexteJustification]] = []

        for prof in professeurs:
            if prof.id in profs_exclus:
                continue  # décision déjà prise pour ce (cours, prof)
            score_total, composants, ctx = _scorer_paire(
                prof, cours, competences_cours, poids, bonus_map
            )
            aff = Affectation(
                session_id=session_id,
                professeur_id=prof.id,
                cours_id=cours.id,
                score_total=score_total,
                score_comp=composants.score_comp.quantize(Decimal("0.001")),
                score_exp=composants.score_exp.quantize(Decimal("0.001")),
                score_hist=composants.score_hist.quantize(Decimal("0.001")),
                score_sem=composants.score_sem.quantize(Decimal("0.001")),
                statut=AffectationStatut.PROPOSEE,
            )
            scores_par_prof.append((float(score_total), aff, ctx))

        top = sorted(scores_par_prof, key=lambda x: x[0], reverse=True)[:TOP_N_PAR_COURS]
        top_par_cours.extend((aff, ctx) for _, aff, ctx in top)

    # Phase 2 — COMMIT IMMÉDIAT avec justification STATIQUE. Le RH voit son
    # tableau en quelques secondes. Aucun appel LLM en synchrone : c'est le
    # point pivot du Niveau 2 (découplage décision/narration). La narration
    # LLM, instable et lente, est déléguée à des tâches Celery asynchrones
    # via la phase 3.
    nouvelles_affectations: list[Affectation] = []
    contextes: list[ContexteJustification] = []
    for aff, ctx in top_par_cours:
        aff.justification = generer_justification_statique(ctx)
        aff.justification_statut = JustificationStatut.STATIQUE
        db.add(aff)
        nouvelles_affectations.append(aff)
        contextes.append(ctx)

    await db.commit()
    for aff in nouvelles_affectations:
        await db.refresh(aff)

    # Phase 3 — Enqueue l'enrichissement LLM (best-effort, idempotent côté
    # worker). Si `xai_actif=False`, la statique est la version définitive,
    # rien à enrichir. Une exception au moment du delay (broker indispo) ne
    # doit pas remettre en cause les affectations déjà commitées : on log et
    # on continue, le RH a son tableau et c'est l'essentiel.
    if xai_actif:
        for aff, ctx in zip(nouvelles_affectations, contextes):
            try:
                _enqueue_enrichissement(aff.id, _ctx_to_dict(ctx))
            except Exception:  # broker Redis down ou autre — non bloquant
                pass

    return nouvelles_affectations, exclus_ids


async def valider_affectation(
    affectation_id: int,
    user_id: int,
    nouveau_statut: AffectationStatut,
    db: AsyncSession,
) -> Affectation:
    """Valide ou rejette une affectation proposée."""
    import datetime

    result = await db.execute(
        select(Affectation).where(Affectation.id == affectation_id)
    )
    aff = result.scalar_one_or_none()
    if aff is None:
        raise ValueError(f"Affectation {affectation_id} introuvable")
    aff.statut = nouveau_statut
    aff.valide_par_user_id = user_id
    aff.valide_le = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(aff)
    return aff


async def creer_affectation_manuelle(
    session_id: int,
    professeur_id: int,
    cours_id: int,
    user_id: int,
    db: AsyncSession,
) -> Affectation:
    """Affecte manuellement un prof à un cours (REV-04) : score réel calculé,
    statut VALIDEE, origine MANUEL, auteur = RH. Upsert sur (session, prof, cours)."""
    import datetime
    from app.models.cv import CVStatut

    prof = (await db.execute(
        select(Professeur).where(Professeur.id == professeur_id).options(
            selectinload(Professeur.user),
            selectinload(Professeur.competences),
            selectinload(Professeur.experiences),
            selectinload(Professeur.cv),
        )
    )).scalar_one_or_none()
    if prof is None:
        raise ValueError("Professeur introuvable")
    if prof.cv is None or prof.cv.statut != CVStatut.TRAITE:
        raise ValueError("CV non traité")

    cours = (await db.execute(
        select(Cours).where(Cours.id == cours_id)
    )).scalar_one_or_none()
    if cours is None:
        raise ValueError("Cours introuvable")

    competences_cours = (await _charger_competences_cours([cours_id], db)).get(cours_id, [])
    poids, xai_actif = await _charger_ponderations(session_id, db)
    bonus_map = await _charger_bonus_historique(session_id, db)

    score_total, composants, ctx = _scorer_paire(
        prof, cours, competences_cours, poids, bonus_map
    )
    justification = await _rediger_justification(ctx, xai_actif)

    aff = (await db.execute(
        select(Affectation).where(
            Affectation.session_id == session_id,
            Affectation.professeur_id == professeur_id,
            Affectation.cours_id == cours_id,
        )
    )).scalar_one_or_none()
    if aff is None:
        aff = Affectation(session_id=session_id, professeur_id=professeur_id, cours_id=cours_id)
        db.add(aff)

    aff.score_total = score_total
    aff.score_comp = composants.score_comp.quantize(Decimal("0.001"))
    aff.score_exp = composants.score_exp.quantize(Decimal("0.001"))
    aff.score_hist = composants.score_hist.quantize(Decimal("0.001"))
    aff.score_sem = composants.score_sem.quantize(Decimal("0.001"))
    aff.justification = justification
    aff.statut = AffectationStatut.VALIDEE
    aff.origine = AffectationOrigine.MANUEL
    aff.valide_par_user_id = user_id
    aff.valide_le = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()
    await db.refresh(aff)
    return aff


async def lister_professeurs_disponibles(
    session_id: int,
    cours_id: int,
    db: AsyncSession,
) -> list[tuple[int, str]]:
    """Profs avec CV traité n'ayant PAS déjà d'affectation *active* (proposée ou
    validée) pour ce (session, cours). Les profs rejetés restent disponibles : le
    RH peut revenir sur un rejet via l'affectation manuelle (upsert côté service).
    Retourne [(professeur_id, nom_complet)] trié par nom."""
    from app.models.cv import CV, CVStatut

    deja = (await db.execute(
        select(Affectation.professeur_id).where(
            Affectation.session_id == session_id,
            Affectation.cours_id == cours_id,
            Affectation.statut != AffectationStatut.REJETEE,
        )
    )).all()
    deja_ids = {row[0] for row in deja}

    profs = (await db.execute(
        select(Professeur)
        .join(CV, CV.professeur_id == Professeur.id)
        .where(CV.statut == CVStatut.TRAITE)
        .options(selectinload(Professeur.user))
    )).scalars().all()

    out = [
        (p.id, p.user.nom_complet if p.user else f"Prof {p.id}")
        for p in profs
        if p.id not in deja_ids
    ]
    out.sort(key=lambda t: t[1])
    return out


async def ajouter_feedback(
    affectation_id: int,
    user_id: int,
    note: int,
    commentaire: str | None,
    db: AsyncSession,
) -> AffectationFeedback:
    """Ajoute un retour RH (1-5 étoiles) sur une affectation validée."""
    fb = AffectationFeedback(
        affectation_id=affectation_id,
        note=note,
        commentaire=commentaire,
        valide_par_user_id=user_id,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


async def update_ponderations(
    session_id: int,
    w1: Decimal,
    w2: Decimal,
    w3: Decimal,
    w4: Decimal,
    db: AsyncSession,
) -> PonderationsSession:
    """Met à jour les pondérations W1-W4 (invariant validé en BDD via CHECK)."""
    result = await db.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == session_id)
    )
    pond = result.scalar_one_or_none()
    if pond is None:
        raise ValueError(f"Aucune pondération pour session_id={session_id}")
    pond.w1 = w1
    pond.w2 = w2
    pond.w3 = w3
    pond.w4 = w4
    await db.commit()
    await db.refresh(pond)
    return pond


@dataclass
class EtapeStatut:
    """Statut d'affectation d'une étape pour une session donnée."""

    id: int
    programme_id: int
    ordre: int
    nom: str | None
    total_cours: int
    cours_couverts: int
    affectation_complete: bool


async def _nb_professeurs_traites(db: AsyncSession) -> int:
    from app.models.cv import CV, CVStatut

    result = await db.execute(
        select(func.count(func.distinct(Professeur.id)))
        .select_from(Professeur)
        .join(CV, CV.professeur_id == Professeur.id)
        .where(CV.statut == CVStatut.TRAITE)
    )
    return int(result.scalar_one() or 0)


async def lister_etapes_avec_statut(
    session_id: int,
    programme_id: int,
    db: AsyncSession,
) -> list[EtapeStatut]:
    """Statut d'affectation de chaque étape d'un programme pour une session.

    Une étape est `affectation_complete` quand elle possède au moins un cours et
    que TOUS ses cours sont couverts. Un cours est couvert s'il a au moins une
    affectation VALIDEE pour la session, ou s'il n'existe aucun candidat éligible
    (aucun professeur au CV traité — cas neutralisé). Une affectation REJETEE ne
    couvre jamais un cours.
    """
    from app.models.etape_programme import EtapeProgramme

    etapes = (await db.execute(
        select(EtapeProgramme)
        .where(EtapeProgramme.programme_id == programme_id)
        .order_by(EtapeProgramme.ordre)
    )).scalars().all()

    liens = (await db.execute(
        select(CoursEtapeProgramme.etape_id, CoursEtapeProgramme.cours_id)
        .where(CoursEtapeProgramme.programme_id == programme_id)
    )).all()
    cours_par_etape: dict[int, list[int]] = {}
    for etape_id, cours_id in liens:
        cours_par_etape.setdefault(etape_id, []).append(cours_id)

    cours_valides = {
        row[0]
        for row in (await db.execute(
            select(Affectation.cours_id).where(
                Affectation.session_id == session_id,
                Affectation.statut == AffectationStatut.VALIDEE,
            )
        )).all()
    }

    aucun_candidat = (await _nb_professeurs_traites(db)) == 0

    resultats: list[EtapeStatut] = []
    for etape in etapes:
        cours_ids = cours_par_etape.get(etape.id, [])
        total = len(cours_ids)
        couverts = sum(
            1 for cid in cours_ids if cid in cours_valides or aucun_candidat
        )
        resultats.append(EtapeStatut(
            id=etape.id,
            programme_id=programme_id,
            ordre=etape.ordre,
            nom=etape.nom,
            total_cours=total,
            cours_couverts=couverts,
            affectation_complete=total > 0 and couverts == total,
        ))
    return resultats
