"""Tests pytest pour l'algorithme de scoring W1-W4 et la justification XAI statique."""

from decimal import Decimal

import pytest

from app.services.scoring import (
    DEFAULT_W1,
    DEFAULT_W2,
    DEFAULT_W3,
    DEFAULT_W4,
    EXPERIENCE_REFERENCE_YEARS,
    ContexteJustification,
    PoidsInvalidesError,
    PoidsScoring,
    ResultatScoring,
    ScoresComposants,
    calculer_score_composite,
    evaluer_profil_cours,
    generer_justification_statique,
    score_competences,
    score_experience,
    score_historique,
    score_semantique,
)


# --- W1 : compétences -------------------------------------------------


def test_score_competences_couverture_complete():
    prof = {"Python", "SQL", "Docker"}
    cours = {"Python", "SQL", "Docker"}
    assert score_competences(prof, cours) == Decimal("1.000")


def test_score_competences_couverture_partielle_arrondie():
    """Helper renvoie le ratio brut ; le quantize à 3 décimales appartient au
    service de persistance (DECIMAL(4,3)). 2/3 ≈ 0,667."""
    from decimal import ROUND_HALF_UP

    prof = {"Python", "SQL"}
    cours = {"Python", "SQL", "GraphQL"}
    brut = score_competences(prof, cours)
    assert brut == Decimal(2) / Decimal(3)
    assert brut.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP) == Decimal("0.667")


def test_score_competences_aucune_couverture():
    prof = {"Java"}
    cours = {"Python", "Rust"}
    assert score_competences(prof, cours) == Decimal("0.000")


def test_score_competences_cours_sans_competence_requise():
    """Garde-fou division par zéro : un cours sans compétence renvoie 0."""
    assert score_competences({"Python"}, set()) == Decimal("0")


def test_score_competences_prof_avec_competences_supplementaires():
    """Seules les compétences requises par le cours comptent."""
    prof = {"Python", "SQL", "Docker", "Kubernetes", "Rust"}
    cours = {"Python", "SQL"}
    assert score_competences(prof, cours) == Decimal("1.000")


# --- W2 : expérience --------------------------------------------------


def test_score_experience_egal_reference():
    assert score_experience(EXPERIENCE_REFERENCE_YEARS) == Decimal("1.000")


def test_score_experience_au_dessus_reference_plafonne_a_un():
    assert score_experience(EXPERIENCE_REFERENCE_YEARS * 2) == Decimal("1.000")


def test_score_experience_partielle():
    # 9 / 12 = 0.750 (Cahier des charges §2.8, exemple Ahmed Diallo)
    assert score_experience(9) == Decimal("0.750")


def test_score_experience_zero():
    assert score_experience(0) == Decimal("0")


def test_score_experience_negative_traitee_comme_zero():
    """Une valeur négative ne doit pas produire un score négatif."""
    assert score_experience(-5) == Decimal("0")


def test_score_experience_reference_personnalisee():
    assert score_experience(5, reference_years=10) == Decimal("0.500")


# --- W3 : historique --------------------------------------------------


def test_score_historique_dans_les_bornes():
    assert score_historique(0.75) == Decimal("0.750")


def test_score_historique_borne_basse():
    assert score_historique(0.0) == Decimal("0.000")


def test_score_historique_borne_haute():
    assert score_historique(1.0) == Decimal("1.000")


def test_score_historique_negatif_clampe_a_zero():
    assert score_historique(-0.3) == Decimal("0.000")


def test_score_historique_au_dessus_de_un_clampe():
    assert score_historique(1.5) == Decimal("1.000")


# --- W4 : sémantique --------------------------------------------------


def test_score_semantique_dans_les_bornes():
    assert score_semantique(0.92) == Decimal("0.920")


def test_score_semantique_clampe_haut():
    assert score_semantique(1.42) == Decimal("1.000")


def test_score_semantique_clampe_bas():
    """Le cosinus peut être négatif ; on clamp à 0 pour cohérence W1-W4."""
    assert score_semantique(-0.5) == Decimal("0.000")


# --- Score composite --------------------------------------------------


def test_calculer_score_composite_arrondi_a_trois_decimales():
    poids = PoidsScoring(
        w1=Decimal("0.25"),
        w2=Decimal("0.25"),
        w3=Decimal("0.25"),
        w4=Decimal("0.25"),
    )
    score = calculer_score_composite(
        poids,
        score_comp=Decimal("1.000"),
        score_exp=Decimal("0.500"),
        score_hist=Decimal("0.000"),
        score_sem=Decimal("0.000"),
    )
    assert score == Decimal("0.375")


def test_calculer_score_composite_decimal_4_3():
    """Le score doit tenir dans DECIMAL(4,3) — max 3 décimales."""
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    score = calculer_score_composite(
        poids,
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.600"),
        score_hist=Decimal("0.900"),
        score_sem=Decimal("0.920"),
    )
    # 3 décimales max
    assert -score.as_tuple().exponent <= 3


# --- evaluer_profil_cours : intégration complète ----------------------


def test_evaluer_profil_cas_cahier_des_charges_ahmed_diallo():
    """Cas Ahmed Diallo / PI-301 du Cahier des charges §2.8 : score attendu 0.840.

    Décomposition CdC §2.8 (valeurs brutes, composite quantizé à la fin) :
      W1 × score_comp = 0.40 × 6/7   ≈ 0.34286
      W2 × score_exp  = 0.30 × 9/12  = 0.22500
      W3 × score_hist = 0.20 × 0.90  = 0.18000
      W4 × score_sem  = 0.10 × 0.92  = 0.09200
      Somme brute                    ≈ 0.83986
      Quantize ROUND_HALF_UP → 0.840
    """
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    competences_prof = {"React", "Node.js", "API REST", "JavaScript", "TypeScript", "MongoDB"}
    competences_cours = {
        "React",
        "Node.js",
        "API REST",
        "JavaScript",
        "TypeScript",
        "MongoDB",
        "GraphQL",
    }
    resultat = evaluer_profil_cours(
        poids=poids,
        competences_prof=competences_prof,
        competences_cours=competences_cours,
        annees_experience=9,
        bonus_historique=0.90,
        similarite_semantique=0.92,
    )
    assert resultat.score_global == Decimal("0.840")


def test_evaluer_profil_retourne_structure_complete():
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    resultat = evaluer_profil_cours(
        poids=poids,
        competences_prof={"Python"},
        competences_cours={"Python"},
        annees_experience=5,
        bonus_historique=0.5,
        similarite_semantique=0.5,
    )
    assert isinstance(resultat, ResultatScoring)
    assert isinstance(resultat.composants, ScoresComposants)
    assert resultat.poids is poids
    # Tous les composants dans [0, 1]
    for comp in (
        resultat.composants.score_comp,
        resultat.composants.score_exp,
        resultat.composants.score_hist,
        resultat.composants.score_sem,
    ):
        assert Decimal("0") <= comp <= Decimal("1")


def test_evaluer_profil_zero_partout_donne_zero():
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    resultat = evaluer_profil_cours(
        poids=poids,
        competences_prof=set(),
        competences_cours={"Python"},
        annees_experience=0,
        bonus_historique=0,
        similarite_semantique=0,
    )
    assert resultat.score_global == Decimal("0.000")


def test_evaluer_profil_un_partout_donne_un():
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    resultat = evaluer_profil_cours(
        poids=poids,
        competences_prof={"Python"},
        competences_cours={"Python"},
        annees_experience=EXPERIENCE_REFERENCE_YEARS,
        bonus_historique=1.0,
        similarite_semantique=1.0,
    )
    # W1+W2+W3+W4 = 1, tous les sous-scores = 1 → composite = 1
    assert resultat.score_global == Decimal("1.000")


# --- Justification XAI statique ---------------------------------------


@pytest.fixture
def contexte_demo() -> ContexteJustification:
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    composants = ScoresComposants(
        score_comp=Decimal("0.857"),
        score_exp=Decimal("0.600"),
        score_hist=Decimal("0.900"),
        score_sem=Decimal("0.920"),
    )
    return ContexteJustification(
        nom_professeur="Ahmed Diallo",
        code_cours="WEB-301",
        titre_cours="Développement Web Full-Stack",
        nb_comp_couvertes=6,
        nb_comp_requises=7,
        competences_maitrisees=["React", "Node.js", "API REST", "JavaScript", "TypeScript"],
        annees_experience=9,
        nb_sessions_precedentes=3,
        note_rh_moyenne=4.5,
        similarite_semantique=0.92,
        score_global_pct=79.5,
        poids=poids,
        composants=composants,
    )


def test_justification_mentionne_les_quatre_dimensions(contexte_demo):
    texte = generer_justification_statique(contexte_demo)
    assert "Compétences" in texte
    assert "Expérience" in texte
    assert "Historique" in texte
    assert "sémantique" in texte


def test_justification_mentionne_les_poids_en_pourcentage(contexte_demo):
    texte = generer_justification_statique(contexte_demo)
    assert "W1 = 40 %" in texte
    assert "W2 = 30 %" in texte
    assert "W3 = 20 %" in texte
    assert "W4 = 10 %" in texte


def test_justification_arrondit_les_poids_non_ronds():
    """Régression : les poids non-ronds doivent utiliser _pct (ROUND_HALF_UP),
    pas int() qui tronque vers zéro. Decimal('0.335') doit afficher 34 %."""
    poids = PoidsScoring(
        w1=Decimal("0.335"),
        w2=Decimal("0.335"),
        w3=Decimal("0.165"),
        w4=Decimal("0.165"),
    )
    composants = ScoresComposants(
        score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"),
        score_hist=Decimal("0.5"),
        score_sem=Decimal("0.5"),
    )
    ctx = ContexteJustification(
        nom_professeur="Test",
        code_cours="X-001",
        titre_cours="Test",
        nb_comp_couvertes=1,
        nb_comp_requises=2,
        competences_maitrisees=["Python"],
        annees_experience=5,
        nb_sessions_precedentes=0,
        note_rh_moyenne=3.0,
        similarite_semantique=0.5,
        score_global_pct=50.0,
        poids=poids,
        composants=composants,
    )
    texte = generer_justification_statique(ctx)
    # 0.335 → 33.5 % → ROUND_HALF_UP → 34 % (truncation aurait donné 33 %)
    assert "W1 = 34 %" in texte
    assert "W2 = 34 %" in texte
    assert "W3 = 17 %" in texte
    assert "W4 = 17 %" in texte


def test_justification_contient_nom_prof_et_code_cours(contexte_demo):
    texte = generer_justification_statique(contexte_demo)
    assert "Ahmed Diallo" in texte
    assert "WEB-301" in texte
    assert "Développement Web Full-Stack" in texte


def test_justification_recommandation_forte_au_dessus_de_80(contexte_demo):
    """Score >= 80 % → 'Fortement recommandé'."""
    fort = ContexteJustification(
        **{**contexte_demo.__dict__, "score_global_pct": 85.0}
    )
    assert "Fortement recommandé" in generer_justification_statique(fort)


def test_justification_recommandation_avec_reserves_entre_60_et_80(contexte_demo):
    """60 <= score < 80 → 'Recommandé avec réserves'."""
    assert "Recommandé avec réserves" in generer_justification_statique(contexte_demo)


def test_justification_a_examiner_en_dessous_de_60(contexte_demo):
    """Score < 60 % → 'À examiner'."""
    faible = ContexteJustification(
        **{**contexte_demo.__dict__, "score_global_pct": 45.0}
    )
    assert "À examiner" in generer_justification_statique(faible)


def test_justification_competences_vides_utilise_fallback():
    poids = PoidsScoring(w1=DEFAULT_W1, w2=DEFAULT_W2, w3=DEFAULT_W3, w4=DEFAULT_W4)
    composants = ScoresComposants(
        score_comp=Decimal("0.000"),
        score_exp=Decimal("0.500"),
        score_hist=Decimal("0.500"),
        score_sem=Decimal("0.500"),
    )
    ctx = ContexteJustification(
        nom_professeur="Test",
        code_cours="X-001",
        titre_cours="Test",
        nb_comp_couvertes=0,
        nb_comp_requises=5,
        competences_maitrisees=[],
        annees_experience=5,
        nb_sessions_precedentes=0,
        note_rh_moyenne=3.0,
        similarite_semantique=0.5,
        score_global_pct=50.0,
        poids=poids,
        composants=composants,
    )
    texte = generer_justification_statique(ctx)
    assert "compétences documentées" in texte


# --- Invariant W1+W2+W3+W4 = 1,0 --------------------------------------


def test_poids_scoring_accepte_somme_exacte_un():
    PoidsScoring(
        w1=Decimal("0.40"),
        w2=Decimal("0.30"),
        w3=Decimal("0.20"),
        w4=Decimal("0.10"),
    )


def test_poids_scoring_accepte_derive_dans_la_tolerance():
    """Tolérance ±0.001 pour absorber les arrondis Decimal côté frontend/DB.

    Somme volontairement décalée à 1,0005 (= 1 + tolérance) pour s'assurer
    que la branche de tolérance est bien exercée, pas seulement le cas exact.
    """
    PoidsScoring(
        w1=Decimal("0.4005"),
        w2=Decimal("0.3000"),
        w3=Decimal("0.2000"),
        w4=Decimal("0.1000"),
    )


def test_poids_scoring_rejette_somme_inferieure_a_un():
    with pytest.raises(PoidsInvalidesError, match="0.99"):
        PoidsScoring(
            w1=Decimal("0.40"),
            w2=Decimal("0.30"),
            w3=Decimal("0.20"),
            w4=Decimal("0.09"),
        )


def test_poids_scoring_rejette_somme_superieure_a_un():
    with pytest.raises(PoidsInvalidesError, match="1.01"):
        PoidsScoring(
            w1=Decimal("0.41"),
            w2=Decimal("0.30"),
            w3=Decimal("0.20"),
            w4=Decimal("0.10"),
        )


def test_poids_scoring_rejette_poids_negatif_qui_compense():
    """Une somme = 1.0 obtenue avec un poids négatif doit aussi être refusée."""
    with pytest.raises(PoidsInvalidesError):
        PoidsScoring(
            w1=Decimal("1.20"),
            w2=Decimal("0.30"),
            w3=Decimal("-0.50"),
            w4=Decimal("0.00"),
        )
