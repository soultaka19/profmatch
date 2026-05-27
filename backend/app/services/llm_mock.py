"""
Extracteur de CV local (sans LLM) — utilisé quand LLM_MOCK_MODE=true.

Parse le texte brut avec des heuristiques simples pour en extraire des
compétences, expériences et formations plausibles. Permet de tester toute
la chaîne d'affectation sans connexion à l'API de compétition.
"""

import re
from app.schemas.extraction import (
    ExtractionLLM,
    CompetenceLLM,
    ExperienceLLM,
    FormationLLM,
    LangueLLM,
)

# ── Dictionnaires de reconnaissance ──────────────────────────────────────────

_COMPETENCES_CONNUES: dict[str, tuple[str, str]] = {
    # pattern (lowercase) -> (nom normalisé, niveau)
    "python": ("Python", "avance"),
    "java": ("Java", "avance"),
    "javascript": ("JavaScript", "avance"),
    "typescript": ("TypeScript", "intermediaire"),
    "react": ("React", "avance"),
    "next.js": ("Next.js", "intermediaire"),
    "node.js": ("Node.js", "intermediaire"),
    "django": ("Django", "intermediaire"),
    "fastapi": ("FastAPI", "intermediaire"),
    "sql": ("SQL", "avance"),
    "postgresql": ("PostgreSQL", "avance"),
    "mysql": ("MySQL", "intermediaire"),
    "mongodb": ("MongoDB", "intermediaire"),
    "docker": ("Docker", "avance"),
    "kubernetes": ("Kubernetes", "intermediaire"),
    "git": ("Git", "avance"),
    "aws": ("AWS", "intermediaire"),
    "linux": ("Linux", "avance"),
    "c++": ("C++", "avance"),
    "c#": ("C#", "intermediaire"),
    "php": ("PHP", "intermediaire"),
    "html": ("HTML/CSS", "expert"),
    "css": ("HTML/CSS", "expert"),
    "vue": ("Vue.js", "intermediaire"),
    "angular": ("Angular", "intermediaire"),
    "machine learning": ("Machine Learning", "intermediaire"),
    "deep learning": ("Deep Learning", "debutant"),
    "tensorflow": ("TensorFlow", "intermediaire"),
    "pytorch": ("PyTorch", "intermediaire"),
    "scrum": ("Méthodes Agile/Scrum", "avance"),
    "agile": ("Méthodes Agile/Scrum", "avance"),
    "rest": ("API REST", "avance"),
    "api": ("Conception d'API", "avance"),
    "redis": ("Redis", "intermediaire"),
    "celery": ("Celery", "intermediaire"),
    "flutter": ("Flutter", "intermediaire"),
    "swift": ("Swift", "intermediaire"),
    "kotlin": ("Kotlin", "intermediaire"),
    "r ": ("R (statistiques)", "intermediaire"),
    "matlab": ("MATLAB", "intermediaire"),
    "excel": ("Excel / VBA", "avance"),
    "spark": ("Apache Spark", "intermediaire"),
    "hadoop": ("Hadoop", "debutant"),
    "ci/cd": ("CI/CD", "avance"),
    "github actions": ("GitHub Actions", "avance"),
}

_DIPLOMES: list[str] = [
    "doctorat", "ph.d", "phd", "maîtrise", "master", "m.sc", "msc",
    "baccalauréat", "bachelor", "b.sc", "bsc", "b.ing", "diplôme",
    "certificat", "attestation", "dec", "d.e.c",
]

_LANGUES_MAP: dict[str, str] = {
    "français": "natif",
    "french": "natif",
    "anglais": "C1",
    "english": "C1",
    "espagnol": "B1",
    "spanish": "B1",
    "allemand": "B1",
    "german": "B1",
    "arabe": "B2",
    "arabic": "B2",
    "portugais": "B1",
    "italian": "B1",
    "italien": "B1",
    "mandarin": "A2",
    "chinois": "A2",
}


# ── Parseurs heuristiques ─────────────────────────────────────────────────────

def _parse_competences(texte: str) -> list[CompetenceLLM]:
    texte_lower = texte.lower()
    seen: set[str] = set()
    result: list[CompetenceLLM] = []

    for pattern, (nom, niveau) in _COMPETENCES_CONNUES.items():
        if pattern in texte_lower and nom not in seen:
            seen.add(nom)
            result.append(CompetenceLLM(nom=nom, niveau=niveau))  # type: ignore[arg-type]

    # Fallback — au moins 3 compétences génériques si rien détecté
    if not result:
        result = [
            CompetenceLLM(nom="Programmation orientée objet", niveau="avance"),  # type: ignore[arg-type]
            CompetenceLLM(nom="Développement logiciel", niveau="avance"),  # type: ignore[arg-type]
            CompetenceLLM(nom="Analyse et conception", niveau="intermediaire"),  # type: ignore[arg-type]
        ]

    return result[:15]  # max 15


def _parse_experiences(texte: str) -> list[ExperienceLLM]:
    """Cherche des blocs d'expérience avec des années (ex: 2018 – 2022)."""
    # Pattern : ligne avec tiret em/en/hyphen et deux années 4 chiffres
    pattern = re.compile(
        r"(?P<annee_debut>20\d{2}|19\d{2})\s*[–—-]\s*(?P<annee_fin>20\d{2}|19\d{2}|présent|present|aujourd|actuel)",
        re.IGNORECASE,
    )
    matches = list(pattern.finditer(texte))
    result: list[ExperienceLLM] = []

    for m in matches[:5]:
        debut = int(m.group("annee_debut"))
        fin_raw = m.group("annee_fin")
        fin: int | None = None
        if re.match(r"\d{4}", fin_raw):
            fin = int(fin_raw)

        # Cherche le contexte avant la date (poste + employeur)
        start = max(0, m.start() - 200)
        context = texte[start : m.start()].strip()
        lines = [l.strip() for l in context.split("\n") if l.strip()]
        poste = lines[-1][:255] if lines else "Poste"
        employeur = lines[-2][:255] if len(lines) >= 2 else "Employeur"

        if debut >= 1980:
            result.append(ExperienceLLM(
                poste=poste,
                employeur=employeur,
                annee_debut=debut,
                annee_fin=fin,
                description_courte=None,
            ))

    # Fallback générique
    if not result:
        result = [
            ExperienceLLM(
                poste="Enseignant(e)",
                employeur="Établissement d'enseignement",
                annee_debut=2018,
                annee_fin=None,
                description_courte="Enseignement de cours en informatique et technologies.",
            )
        ]

    return result


def _parse_formations(texte: str) -> list[FormationLLM]:
    texte_lower = texte.lower()
    result: list[FormationLLM] = []
    seen_annees: set[int] = set()

    for diplome_kw in _DIPLOMES:
        idx = texte_lower.find(diplome_kw)
        if idx == -1:
            continue

        # Cherche une année sur les 200 chars suivants
        context = texte[idx : idx + 200]
        annee_match = re.search(r"(20\d{2}|19\d{2})", context)
        if not annee_match:
            continue
        annee = int(annee_match.group(1))
        if annee in seen_annees:
            continue
        seen_annees.add(annee)

        # Extrait libellé sur la même ligne
        ligne = context.split("\n")[0].strip()[:255]
        result.append(FormationLLM(
            diplome=ligne or diplome_kw.capitalize(),
            etablissement="Établissement",
            annee=annee,
        ))

        if len(result) >= 3:
            break

    if not result:
        result = [
            FormationLLM(
                diplome="Baccalauréat en informatique",
                etablissement="Université",
                annee=2015,
            )
        ]

    return result


def _parse_langues(texte: str) -> list[LangueLLM]:
    texte_lower = texte.lower()
    result: list[LangueLLM] = []

    for langue, niveau in _LANGUES_MAP.items():
        if langue in texte_lower:
            result.append(LangueLLM(langue=langue.capitalize(), niveau=niveau))  # type: ignore[arg-type]

    if not result:
        result = [LangueLLM(langue="Français", niveau="natif")]  # type: ignore[arg-type]

    return result[:4]


def _build_resume(texte: str) -> str:
    """Génère un résumé à partir des 3 premières lignes non-vides du CV."""
    lines = [l.strip() for l in texte.split("\n") if l.strip()]
    snippet = " | ".join(lines[:4])
    return snippet[:500] if snippet else "Profil professionnel."


# ── Point d'entrée public ─────────────────────────────────────────────────────

def mock_extract(texte_brut: str) -> ExtractionLLM:
    """Extraction locale sans LLM — parsing heuristique du texte brut.

    Retourne un ExtractionLLM valide, suffisant pour alimenter le pipeline
    de scoring W1–W4 en mode développement.
    """
    return ExtractionLLM(
        resume=_build_resume(texte_brut),
        competences=_parse_competences(texte_brut),
        experiences=_parse_experiences(texte_brut),
        formations=_parse_formations(texte_brut),
        langues=_parse_langues(texte_brut),
    )
