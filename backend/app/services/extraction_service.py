import re

from openai import OpenAI
from pydantic import ValidationError
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.competence import Competence, SourceOrigine
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue
from app.models.professeur import Professeur
from app.schemas.extraction import ExtractionLLM
from app.services import embeddings
from app.services.llm_prompts import build_extraction_prompt


class ExtractionError(Exception):
    """Erreur permanente d'extraction LLM (validation 2× ou JSON cassé)."""


# Bloc de code Markdown entourant parfois la réponse : ```json ... ``` ou ``` ... ```
_BLOC_MARKDOWN = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)


def _json_nu(raw: str) -> str:
    """Retire un éventuel bloc de code Markdown autour du JSON.

    Le prompt demande du JSON nu, et les modèles s'y tiennent la plupart du
    temps — mais pas tous, ni dans toutes leurs configurations : Gemini renvoie
    du JSON nu par défaut et l'entoure de ```json dès qu'on baisse son effort de
    raisonnement. Sans ce nettoyage, `model_validate_json` échoue, la boucle de
    retry consomme ses trois tentatives, et l'extraction se solde par une erreur
    alors que le contenu était bon. Le coût du nettoyage est nul, celui de son
    absence est de trois appels LLM et un CV en statut `erreur`.
    """
    bloc = _BLOC_MARKDOWN.match(raw)
    return bloc.group(1) if bloc else raw


def extract_structured_data(texte_brut: str, client: OpenAI) -> ExtractionLLM:
    """Appelle le LLM avec retry sur ValidationError.

    Max 1 + LLM_MAX_RETRIES tentatives. La 2e+ tentative inclut l'erreur de
    validation précédente dans le prompt pour aider le LLM à corriger.
    """
    base_prompt = build_extraction_prompt(texte_brut)
    last_error: str | None = None

    for attempt in range(settings.LLM_MAX_RETRIES + 1):
        prompt = base_prompt
        if last_error is not None:
            prompt += (
                f"\n\nERREUR DE VALIDATION précédente : {last_error}\n"
                "Corrige ces erreurs et renvoie UNIQUEMENT un JSON valide."
            )

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=settings.LLM_EXTRACTION_MAX_TOKENS,
            # Override per-requête : l'extraction génère beaucoup plus de tokens
            # que la narration XAI ; le timeout de 15 s du client est trop court
            # pour le modèle 120B et provoquait des ReadTimeout systématiques.
            timeout=settings.LLM_EXTRACTION_TIMEOUT_S,
        )
        raw = _json_nu(response.choices[0].message.content or "")

        try:
            return ExtractionLLM.model_validate_json(raw)
        except ValidationError as e:
            last_error = str(e)
            if attempt == settings.LLM_MAX_RETRIES:
                raise ExtractionError(
                    f"Validation IA échouée après {attempt + 1} tentatives : {e}"
                ) from e
        except ValueError as e:
            # JSON malformé — on retry aussi
            last_error = f"JSON invalide: {e}"
            if attempt == settings.LLM_MAX_RETRIES:
                raise ExtractionError(
                    f"JSON IA invalide après {attempt + 1} tentatives : {e}"
                ) from e

    raise ExtractionError("Boucle de retry épuisée (état inatteignable)")


def persist_extraction(db: Session, professeur_id: int, data: ExtractionLLM) -> None:
    """Persiste atomiquement les 5 entités (profil + 4 listes).

    Stratégie de re-upload :
    - 4 tables enfants : DELETE WHERE source='llm' puis INSERT
    - resume_profil : UPDATE conditionnel WHERE source='llm' (préserve manual)

    Tout dans la transaction courante. Pas de commit interne — l'appelant gère.
    """
    # 1. Supprimer les anciennes lignes 'llm' des 4 tables enfants
    for Entity in (Competence, Experience, Formation, Langue):
        db.execute(
            delete(Entity).where(
                Entity.professeur_id == professeur_id,
                Entity.source == SourceOrigine.LLM,
            )
        )

    # 2. Insérer les nouvelles compétences
    for c in data.competences:
        db.add(
            Competence(
                professeur_id=professeur_id,
                nom=c.nom,
                niveau=c.niveau,
                source=SourceOrigine.LLM,
            )
        )

    # 3. Insérer les nouvelles expériences avec ordre stable
    for idx, e in enumerate(data.experiences):
        db.add(
            Experience(
                professeur_id=professeur_id,
                poste=e.poste,
                employeur=e.employeur,
                annee_debut=e.annee_debut,
                annee_fin=e.annee_fin,
                description_courte=e.description_courte,
                source=SourceOrigine.LLM,
                ordre=idx,
            )
        )

    # 4. Insérer les nouvelles formations
    for idx, f in enumerate(data.formations):
        db.add(
            Formation(
                professeur_id=professeur_id,
                diplome=f.diplome,
                etablissement=f.etablissement,
                annee=f.annee,
                source=SourceOrigine.LLM,
                ordre=idx,
            )
        )

    # 5. Insérer les nouvelles langues
    for lang in data.langues:
        db.add(
            Langue(
                professeur_id=professeur_id,
                langue=lang.langue,
                niveau=lang.niveau,
                source=SourceOrigine.LLM,
            )
        )

    # 6. UPDATE conditionnel du resume_profil — n'écrase JAMAIS un 'manual'
    db.execute(
        update(Professeur)
        .where(
            Professeur.id == professeur_id,
            Professeur.resume_profil_source == SourceOrigine.LLM,
        )
        .values(
            resume_profil=data.resume,
            resume_profil_source=SourceOrigine.LLM,
        )
    )


def compute_professeur_embedding(db: Session, professeur_id: int) -> None:
    """Calcule et persiste l'embedding W4 du professeur (similarité sémantique).

    Source : résumé de profil + compétences + expériences déjà persistés. À
    appeler après `persist_extraction`, dans la même transaction (pas de commit
    interne). Sans embedding, le score W4 vaut toujours 0.
    """
    prof = db.execute(select(Professeur).where(Professeur.id == professeur_id)).scalar_one_or_none()
    if prof is None:
        return
    competences = [c.nom for c in prof.competences]
    experiences = [
        " ".join(filter(None, (e.poste, e.employeur, e.description_courte)))
        for e in prof.experiences
    ]
    texte = embeddings.build_professeur_text(prof.resume_profil, competences, experiences)
    prof.embedding = embeddings.compute_embedding(texte)
