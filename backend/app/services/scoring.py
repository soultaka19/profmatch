"""Algorithme de scoring pondéré pour l'affectation professeur-cours.

Formule officielle (Livrable 1, §2.8) :
    Score = W1 × score_comp + W2 × score_exp + W3 × score_hist + W4 × score_sem

Contrainte : W1 + W2 + W3 + W4 = 1,0 (validée côté API / frontend).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

# Base de référence pour la normalisation de l'expérience (Cahier des charges §2.8 :
# texte et exemple chiffré "9 ans, base 12 → 0,750"). Score Ahmed Diallo = 0,840.
EXPERIENCE_REFERENCE_YEARS: int = 12

# Pondérations par défaut recommandées.
DEFAULT_W1: Decimal = Decimal("0.40")
DEFAULT_W2: Decimal = Decimal("0.30")
DEFAULT_W3: Decimal = Decimal("0.20")
DEFAULT_W4: Decimal = Decimal("0.10")

# Tolérance d'arrondi sur la validation de l'invariant W1+W2+W3+W4 = 1,0.
# Les pondérations arrivent depuis le frontend en Decimal à 3 décimales — on
# accepte une dérive ≤ 0,001 pour absorber les arrondis successifs.
SOMME_POIDS_TOLERANCE: Decimal = Decimal("0.001")


class PoidsInvalidesError(ValueError):
    """La somme W1+W2+W3+W4 s'écarte de 1,0 au-delà de la tolérance."""


@dataclass(frozen=True)
class PoidsScoring:
    """Poids W1–W4 pour une session — invariant W1+W2+W3+W4 = 1,0."""

    w1: Decimal
    w2: Decimal
    w3: Decimal
    w4: Decimal

    def __post_init__(self) -> None:
        poids = (self.w1, self.w2, self.w3, self.w4)
        if any(p < Decimal("0") for p in poids):
            raise PoidsInvalidesError(
                f"Tous les poids doivent être >= 0 ; reçus {poids}"
            )
        somme = sum(poids, start=Decimal("0"))
        if abs(somme - Decimal("1")) > SOMME_POIDS_TOLERANCE:
            raise PoidsInvalidesError(
                f"W1+W2+W3+W4 = {somme} (attendu 1,000 ± {SOMME_POIDS_TOLERANCE})"
            )


@dataclass(frozen=True)
class ScoresComposants:
    """Scores normalisés sur [0, 1] pour chaque critère."""

    score_comp: Decimal
    score_exp: Decimal
    score_hist: Decimal
    score_sem: Decimal


@dataclass(frozen=True)
class ResultatScoring:
    """Résultat complet d'un calcul professeur-cours."""

    score_global: Decimal
    composants: ScoresComposants
    poids: PoidsScoring


def score_competences(
    competences_prof: set[str],
    competences_cours: set[str],
) -> Decimal:
    """W1 — Ratio brut des compétences du cours couvertes par le professeur.

    Exemple : 6 compétences couvertes sur 7 requises → 6/7 ≈ 0,857.
    Le résultat n'est PAS quantizé : c'est le service de persistance qui
    arrondira à 3 décimales (DECIMAL(4,3)) au moment d'écrire en BDD.
    """
    if not competences_cours:
        return Decimal("0")
    couvertes = competences_prof & competences_cours
    return Decimal(len(couvertes)) / Decimal(len(competences_cours))


def score_experience(
    annees_experience: float,
    reference_years: int = EXPERIENCE_REFERENCE_YEARS,
) -> Decimal:
    """W2 — Années d'expérience normalisées brut : min(années / référence, 1.0)."""
    if annees_experience <= 0:
        return Decimal("0")
    ratio = min(annees_experience / reference_years, 1.0)
    return Decimal(str(ratio))


def score_historique(bonus_normalise: float) -> Decimal:
    """W3 — Bonus de continuité brut (déjà normalisé dans [0, 1] en amont)."""
    valeur = max(0.0, min(1.0, bonus_normalise))
    return Decimal(str(valeur))


def score_semantique(similarite_cosinus: float) -> Decimal:
    """W4 — Similarité sémantique brute (cosinus ou score LLM) plafonnée à [0, 1]."""
    valeur = max(0.0, min(1.0, similarite_cosinus))
    return Decimal(str(valeur))


def calculer_score_composite(
    poids: PoidsScoring,
    score_comp: Decimal,
    score_exp: Decimal,
    score_hist: Decimal,
    score_sem: Decimal,
) -> Decimal:
    """Score composite pondéré, arrondi à 3 décimales (DECIMAL(4,3) en BDD)."""
    brut = (
        poids.w1 * score_comp
        + poids.w2 * score_exp
        + poids.w3 * score_hist
        + poids.w4 * score_sem
    )
    return brut.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def evaluer_profil_cours(
    poids: PoidsScoring,
    competences_prof: set[str],
    competences_cours: set[str],
    annees_experience: float,
    bonus_historique: float,
    similarite_semantique: float,
) -> ResultatScoring:
    """Calcule les quatre sous-scores et le score global pour une paire (P, C)."""
    composants = ScoresComposants(
        score_comp=score_competences(competences_prof, competences_cours),
        score_exp=score_experience(annees_experience),
        score_hist=score_historique(bonus_historique),
        score_sem=score_semantique(similarite_semantique),
    )
    score_global = calculer_score_composite(
        poids,
        composants.score_comp,
        composants.score_exp,
        composants.score_hist,
        composants.score_sem,
    )
    return ResultatScoring(
        score_global=score_global,
        composants=composants,
        poids=poids,
    )


@dataclass(frozen=True)
class ContexteJustification:
    """Données nécessaires à la justification XAI statique (Maquette 5)."""

    nom_professeur: str
    code_cours: str
    titre_cours: str
    nb_comp_couvertes: int
    nb_comp_requises: int
    competences_maitrisees: list[str]
    annees_experience: int
    nb_sessions_precedentes: int
    note_rh_moyenne: float
    similarite_semantique: float
    score_global_pct: float
    poids: PoidsScoring
    composants: ScoresComposants


def _pct(decimal_score: Decimal) -> int:
    """Convertit un score [0,1] en pourcentage entier pour l'affichage RH."""
    return int((decimal_score * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def generer_justification_statique(ctx: ContexteJustification) -> str:
    """Génère l'explication narrative XAI pour le tableau de bord RH (Maquette 5).

    Structure en quatre dimensions alignées sur W1–W4, sans appel LLM.
    """
    competences_str = (
        ", ".join(ctx.competences_maitrisees[:5])
        if ctx.competences_maitrisees
        else "compétences documentées"
    )
    w1_pct = _pct(ctx.poids.w1)
    w2_pct = _pct(ctx.poids.w2)
    w3_pct = _pct(ctx.poids.w3)
    w4_pct = _pct(ctx.poids.w4)
    exp_pct = _pct(ctx.composants.score_exp)
    reco = (
        "Fortement recommandé pour affectation."
        if ctx.score_global_pct >= 80
        else "Recommandé avec réserves."
        if ctx.score_global_pct >= 60
        else "À examiner."
    )

    return (
        f"Professeur {ctx.nom_professeur} — Cours {ctx.code_cours} {ctx.titre_cours} :\n"
        f"• Compétences (W1 = {w1_pct} %) : Maîtrise confirmée de {competences_str}. "
        f"Le cours requiert {ctx.nb_comp_requises} compétences ; "
        f"le profil en couvre {ctx.nb_comp_couvertes} "
        f"(score {_pct(ctx.composants.score_comp)} %).\n"
        f"• Expérience (W2 = {w2_pct} %) : {ctx.annees_experience} ans d'expérience "
        f"métier. Score normalisé à {exp_pct} sur 100 "
        f"(base {EXPERIENCE_REFERENCE_YEARS} ans).\n"
        f"• Historique (W3 = {w3_pct} %) : Enseignement du cours validé lors de "
        f"{ctx.nb_sessions_precedentes} session(s) précédente(s). "
        f"Note RH moyenne de {ctx.note_rh_moyenne:.1f} sur 5. "
        f"Bonus de continuité appliqué (score {_pct(ctx.composants.score_hist)} %).\n"
        f"• Adéquation sémantique (W4 = {w4_pct} %) : Similarité de "
        f"{ctx.similarite_semantique:.2f} entre le profil et la description du cours "
        f"(score {_pct(ctx.composants.score_sem)} %).\n"
        f"Score global : {ctx.score_global_pct:.1f} %. Recommandation : {reco}"
    )
