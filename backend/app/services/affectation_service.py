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

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.affectation import Affectation, AffectationOrigine, AffectationStatut
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.cours_etape_programme import CoursEtapeProgramme
from app.models.ponderations_session import PonderationsSession
from app.models.professeur import Professeur
from app.models.programme import Programme
from app.models.session import Session
from app.services.academic_calendar import programme_actif_pour_session
from app.services.embeddings import build_cours_text, build_professeur_text, cosine_similarity
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

TOP_N_PAR_COURS: int = 3


async def _charger_ponderations(session_id: int, db: AsyncSession) -> PoidsScoring:
    result = await db.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == session_id)
    )
    pond = result.scalar_one_or_none()
    if pond is None:
        raise ValueError(f"Aucune pondération trouvée pour session_id={session_id}")
    return PoidsScoring(w1=pond.w1, w2=pond.w2, w3=pond.w3, w4=pond.w4)


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


async def _bonus_historique(
    prof_id: int,
    cours_id: int,
    session_id: int,
    db: AsyncSession,
) -> float:
    """Calcule le bonus W3 : (nb_validees × note_moyenne) / nb_sessions, normalisé [0,1].

    Conforme Cahier des charges §2.8 boucle de rétroaction.
    """
    result = await db.execute(
        select(
            func.count(AffectationFeedback.id),
            func.avg(AffectationFeedback.note),
        )
        .join(Affectation, Affectation.id == AffectationFeedback.affectation_id)
        .where(
            Affectation.professeur_id == prof_id,
            Affectation.cours_id == cours_id,
            Affectation.statut == AffectationStatut.VALIDEE,
            Affectation.session_id != session_id,
        )
    )
    row = result.one()
    nb_validees, note_moy = row[0], row[1]
    if not nb_validees or note_moy is None:
        return 0.0
    # Normalise sur [0, 1] : note_moy est dans [1,5], on divise par 5
    bonus = float(nb_validees) * float(note_moy) / (5.0 * max(nb_validees, 1))
    return min(1.0, bonus)


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


async def _scorer_paire(
    prof: Professeur,
    cours: Cours,
    competences_cours: list[CoursCompetence],
    poids: PoidsScoring,
    session_id: int,
    db: AsyncSession,
) -> tuple[Decimal, ScoresComposants, str]:
    """Calcule (score_total, composants W1–W4, justification statique) pour un
    couple (prof, cours). Extrait de generer_affectations pour réutilisation par
    l'affectation manuelle (REV-04). Le prof doit avoir competences/experiences/
    user/embedding chargés."""
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

    bonus_hist = await _bonus_historique(prof.id, cours.id, session_id, db)
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
        nb_sessions_precedentes=0,
        note_rh_moyenne=0.0,
        similarite_semantique=sim,
        score_global_pct=float(score_total) * 100,
        poids=poids,
        composants=composants,
    )
    justification = generer_justification_statique(ctx)
    return score_total, composants, justification


async def generer_affectations(
    session_id: int,
    programme_ids: list[int],
    db: AsyncSession,
    etape_ids: list[int] | None = None,
) -> tuple[list[Affectation], list[int]]:
    """Génère et persiste le top-3 d'affectations pour chaque cours des programmes éligibles.

    Supprime les propositions PROPOSEE existantes avant de regénérer.
    Retourne (affectations, programmes_exclus_ids).
    """
    poids = await _charger_ponderations(session_id, db)

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

    # Supprimer les affectations PROPOSEE existantes pour cette session
    existing = await db.execute(
        select(Affectation).where(
            Affectation.session_id == session_id,
            Affectation.statut == AffectationStatut.PROPOSEE,
        )
    )
    for aff in existing.scalars().all():
        await db.delete(aff)
    await db.flush()

    nouvelles_affectations: list[Affectation] = []

    for cours in cours_list:
        competences_cours = competences_par_cours.get(cours.id, [])
        scores_par_prof: list[tuple[float, Affectation]] = []

        for prof in professeurs:
            score_total, composants, justification = await _scorer_paire(
                prof, cours, competences_cours, poids, session_id, db
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
                justification=justification,
                statut=AffectationStatut.PROPOSEE,
            )
            scores_par_prof.append((float(score_total), aff))

        top = sorted(scores_par_prof, key=lambda x: x[0], reverse=True)[:TOP_N_PAR_COURS]
        for _, aff in top:
            db.add(aff)
            nouvelles_affectations.append(aff)

    await db.commit()
    for aff in nouvelles_affectations:
        await db.refresh(aff)

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
    poids = await _charger_ponderations(session_id, db)

    score_total, composants, justification = await _scorer_paire(
        prof, cours, competences_cours, poids, session_id, db
    )

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
    """Profs avec CV traité n'ayant PAS déjà d'affectation pour ce (session, cours).
    Retourne [(professeur_id, nom_complet)] trié par nom."""
    from app.models.cv import CV, CVStatut

    deja = (await db.execute(
        select(Affectation.professeur_id).where(
            Affectation.session_id == session_id,
            Affectation.cours_id == cours_id,
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
