"""Seed 11 professeurs additionnels avec CV traités pour la démo.

Usage :
    docker compose exec backend python scripts/seed_profs_demo.py
    # ou en local (depuis profmatch/backend/) :
    python scripts/seed_profs_demo.py

Idempotent : skip si l'email existe déjà.

Chaque professeur reçoit :
- Un compte User (role=PROF) → Professeur créé automatiquement par le listener
- Un CV avec statut=TRAITE (contournement de la pipeline LLM pour la démo)
- Des Competence alignées sur les noms des CoursCompetence (matching case-insensitive)
- Des Experience (annee_debut / annee_fin) pour le score W2
- Des Formation pour l'enrichissement du profil
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models import *  # noqa: F401 — enregistre tous les modèles + listeners
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.cv import CV, CVStatut
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue, LangueNiveau
from app.models.professeur import Professeur
from app.models.user import User, UserRole


# ─── Données des 11 professeurs ──────────────────────────────────────────────
# Compétences : noms identiques aux CoursCompetence (matching case-insensitive)
# Cours couverts (pour référence — pas utilisé par le script) :
#   30733 IFM → Python(5), Algorithmique(4), Variables et structures(3)
#   25906 IFM → SQL(5), Modélisation relationnelle(4), PostgreSQL(3)
#   30742 IFM → UML(4), Analyse fonctionnelle(5), Merise(3)
#   29990 IFM → FastAPI(5), REST(5), Python(4), JWT(3)
#   30746 IFM → SQL avancé(5), Optimisation(4), PostgreSQL(5), Index(3)
#   25909 IFM → JavaScript(5), HTML/CSS(4), React(3)
#   29983 IFM → Algorithmes(5), Python(4), Complexité(4)
#   IAI-301   → Python(5), scikit-learn(5), Statistiques(4), NumPy(3)
#   IAI-302   → PyTorch(5), Python(5), Mathématiques(4), GPU(3)
#   IAI-303   → NLP(5), Transformers(5), Python(4), Hugging Face(4)

PROFS_DATA = [
    # ── 1. Marie Lemoine — Python · Algorithmique · Structures de données ──
    {
        "email": "marie.lemoine@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Marie Lemoine",
        "resume_profil": (
            "Développeuse logiciel senior spécialisée Python, algorithmique et "
            "structures de données. 8 ans d'expérience en développement de systèmes "
            "logiciels complexes. Passionnée par l'enseignement de la programmation."
        ),
        "competences": [
            ("Python", CompetenceNiveau.EXPERT),
            ("Algorithmique", CompetenceNiveau.AVANCE),
            ("Variables et structures", CompetenceNiveau.AVANCE),
            ("Algorithmes", CompetenceNiveau.AVANCE),
            ("Complexité", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Développeuse logiciel senior",
                "employeur": "Ubisoft Montréal",
                "annee_debut": 2016,
                "annee_fin": 2024,
                "description_courte": "Développement de systèmes en Python pour moteurs de jeu.",
                "ordre": 0,
            },
            {
                "poste": "Chargée de cours",
                "employeur": "Collège La Cité",
                "annee_debut": 2020,
                "annee_fin": None,
                "description_courte": "Enseignement introduction à la programmation.",
                "ordre": 1,
            },
        ],
        "formations": [
            {"diplome": "B.Sc. Informatique", "etablissement": "Université d'Ottawa", "annee": 2016, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.C1)],
        "cv_texte": "Marie Lemoine — Développeuse logiciel. Python expert, algorithmique, structures de données. Ubisoft 2016-2024.",
    },

    # ── 2. Pierre Gagnon — SQL · PostgreSQL · BDD · UML ─────────────────────
    {
        "email": "pierre.gagnon@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Pierre Gagnon",
        "resume_profil": (
            "Administrateur de bases de données avec 12 ans chez Bell Canada. "
            "Expert PostgreSQL, SQL avancé, modélisation relationnelle et UML. "
            "Formateur certifié en bases de données."
        ),
        "competences": [
            ("SQL", CompetenceNiveau.EXPERT),
            ("PostgreSQL", CompetenceNiveau.EXPERT),
            ("Modélisation relationnelle", CompetenceNiveau.AVANCE),
            ("SQL avancé", CompetenceNiveau.AVANCE),
            ("Index", CompetenceNiveau.INTERMEDIAIRE),
            ("Optimisation", CompetenceNiveau.INTERMEDIAIRE),
            ("UML", CompetenceNiveau.AVANCE),
            ("Analyse fonctionnelle", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Administrateur de bases de données senior",
                "employeur": "Bell Canada",
                "annee_debut": 2012,
                "annee_fin": 2024,
                "description_courte": "Gestion et optimisation des bases de données PostgreSQL à large échelle.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "B.Sc. Génie informatique", "etablissement": "Polytechnique Montréal", "annee": 2012, "ordre": 0},
            {"diplome": "PostgreSQL DBA Certification", "etablissement": "EnterpriseDB", "annee": 2015, "ordre": 1},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.B2)],
        "cv_texte": "Pierre Gagnon — DBA 12 ans. SQL, PostgreSQL expert. Modélisation relationnelle, UML, SQL avancé, index, optimisation.",
    },

    # ── 3. Sophie Martin — FastAPI · REST · Backend · JavaScript ────────────
    {
        "email": "sophie.martin@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Sophie Martin",
        "resume_profil": (
            "Développeuse backend senior (FastAPI, REST, JWT) avec 7 ans chez Shopify Canada. "
            "Expertise APIs RESTful, authentification JWT, Python. "
            "Connaissances frontend JavaScript/HTML pour intégration complète."
        ),
        "competences": [
            ("FastAPI", CompetenceNiveau.EXPERT),
            ("REST", CompetenceNiveau.EXPERT),
            ("Python", CompetenceNiveau.AVANCE),
            ("JWT", CompetenceNiveau.AVANCE),
            ("JavaScript", CompetenceNiveau.INTERMEDIAIRE),
            ("HTML/CSS", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Développeuse backend senior",
                "employeur": "Shopify Canada",
                "annee_debut": 2017,
                "annee_fin": 2024,
                "description_courte": "APIs FastAPI haute disponibilité, authentification OAuth2/JWT.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "B.Sc. Informatique", "etablissement": "McGill University", "annee": 2017, "ordre": 0},
        ],
        "langues": [("Anglais", LangueNiveau.NATIF), ("Français", LangueNiveau.C1)],
        "cv_texte": "Sophie Martin — Backend FastAPI, REST, Python, JWT. JavaScript, HTML/CSS. Shopify 7 ans.",
    },

    # ── 4. Luc Boudreault — JavaScript · React · Frontend ───────────────────
    {
        "email": "luc.boudreault@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Luc Boudreault",
        "resume_profil": (
            "Développeur frontend React avec 9 ans chez Desjardins. "
            "Maîtrise JavaScript ES2024, React, HTML/CSS. "
            "Formateur web client et interfaces utilisateur modernes."
        ),
        "competences": [
            ("JavaScript", CompetenceNiveau.EXPERT),
            ("React", CompetenceNiveau.AVANCE),
            ("HTML/CSS", CompetenceNiveau.AVANCE),
        ],
        "experiences": [
            {
                "poste": "Développeur frontend senior",
                "employeur": "Desjardins",
                "annee_debut": 2015,
                "annee_fin": 2024,
                "description_courte": "Développement interfaces React pour applications bancaires.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "DEC Informatique", "etablissement": "Collège Ahuntsic", "annee": 2015, "ordre": 0},
            {"diplome": "React Certified Developer", "etablissement": "Meta", "annee": 2019, "ordre": 1},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.B1)],
        "cv_texte": "Luc Boudreault — Frontend React expert, JavaScript, HTML/CSS. Desjardins 9 ans.",
    },

    # ── 5. Isabelle Côté — UML · Analyse fonctionnelle · Merise ─────────────
    {
        "email": "isabelle.cote@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Isabelle Côté",
        "resume_profil": (
            "Analyste-conceptrice senior (UML, Merise) avec 15 ans chez CGI. "
            "Experte en analyse fonctionnelle et conception de systèmes d'information. "
            "Formatrice certifiée UML et Scrum."
        ),
        "competences": [
            ("UML", CompetenceNiveau.EXPERT),
            ("Analyse fonctionnelle", CompetenceNiveau.EXPERT),
            ("Merise", CompetenceNiveau.AVANCE),
        ],
        "experiences": [
            {
                "poste": "Analyste-conceptrice senior",
                "employeur": "CGI",
                "annee_debut": 2009,
                "annee_fin": 2024,
                "description_courte": "Modélisation UML, rédaction de spécifications fonctionnelles.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "M.Sc. Génie logiciel", "etablissement": "UQAM", "annee": 2009, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.C1)],
        "cv_texte": "Isabelle Côté — Analyste. UML expert, Analyse fonctionnelle expert, Merise. CGI 15 ans.",
    },

    # ── 6. Antoine Moreau — ML · scikit-learn · Statistiques · Maths ────────
    {
        "email": "antoine.moreau@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Antoine Moreau",
        "resume_profil": (
            "Ingénieur ML avec 6 ans chez Element AI (acquis par ServiceNow). "
            "Spécialiste scikit-learn, statistiques appliquées, Python. "
            "Modèles classiques, évaluation de performance, Mathématiques et Algorithmes."
        ),
        "competences": [
            ("scikit-learn", CompetenceNiveau.EXPERT),
            ("Python", CompetenceNiveau.AVANCE),
            ("Statistiques", CompetenceNiveau.AVANCE),
            ("NumPy", CompetenceNiveau.INTERMEDIAIRE),
            ("Mathématiques", CompetenceNiveau.INTERMEDIAIRE),
            ("Algorithmes", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Ingénieur ML",
                "employeur": "Element AI",
                "annee_debut": 2018,
                "annee_fin": 2021,
                "description_courte": "Modèles de classification et régression en production.",
                "ordre": 0,
            },
            {
                "poste": "Scientifique de données senior",
                "employeur": "ServiceNow Canada",
                "annee_debut": 2021,
                "annee_fin": 2024,
                "description_courte": "Pipelines ML scikit-learn, monitoring de modèles.",
                "ordre": 1,
            },
        ],
        "formations": [
            {"diplome": "M.Sc. Mathématiques appliquées", "etablissement": "Université de Montréal", "annee": 2018, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.C1)],
        "cv_texte": "Antoine Moreau — ML. scikit-learn expert, Python, Statistiques, NumPy, Mathématiques, Algorithmes.",
    },

    # ── 7. Fatou Diallo — PyTorch · Deep Learning · Transformers ────────────
    {
        "email": "fatou.diallo@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Fatou Diallo",
        "resume_profil": (
            "Research scientist spécialisée en deep learning et PyTorch au Mila. "
            "5 ans de recherche sur les réseaux de neurones, GPU computing, "
            "vision par ordinateur et Transformers. Publications IEEE/NeurIPS."
        ),
        "competences": [
            ("PyTorch", CompetenceNiveau.EXPERT),
            ("Python", CompetenceNiveau.AVANCE),
            ("Mathématiques", CompetenceNiveau.AVANCE),
            ("GPU", CompetenceNiveau.INTERMEDIAIRE),
            ("Transformers", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Research Scientist",
                "employeur": "Mila — Institut québécois d'IA",
                "annee_debut": 2019,
                "annee_fin": 2024,
                "description_courte": "Recherche deep learning, PyTorch, vision par ordinateur.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "Ph.D. Informatique (Deep Learning)", "etablissement": "Université de Montréal", "annee": 2019, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.C1), ("Anglais", LangueNiveau.C2), ("Wolof", LangueNiveau.NATIF)],
        "cv_texte": "Fatou Diallo — Deep Learning. PyTorch expert, Mathématiques, GPU, Transformers. Mila 5 ans.",
    },

    # ── 8. Rania El-Khoury — NLP · Transformers · Hugging Face ─────────────
    {
        "email": "rania.elkhoury@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Rania El-Khoury",
        "resume_profil": (
            "Ingénieure NLP senior chez Coveo. 4 ans de spécialisation en "
            "traitement du langage naturel, Transformers, Hugging Face et Python. "
            "Co-auteure de modèles BERT fine-tunés pour la recherche en français."
        ),
        "competences": [
            ("NLP", CompetenceNiveau.EXPERT),
            ("Transformers", CompetenceNiveau.EXPERT),
            ("Hugging Face", CompetenceNiveau.AVANCE),
            ("Python", CompetenceNiveau.AVANCE),
        ],
        "experiences": [
            {
                "poste": "Ingénieure NLP senior",
                "employeur": "Coveo",
                "annee_debut": 2020,
                "annee_fin": 2024,
                "description_courte": "Développement modèles Transformers pour la recherche sémantique.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "M.Sc. Linguistique computationnelle", "etablissement": "Université Laval", "annee": 2020, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.C1), ("Anglais", LangueNiveau.C1), ("Arabe", LangueNiveau.NATIF)],
        "cv_texte": "Rania El-Khoury — NLP expert, Transformers expert, Hugging Face, Python. Coveo 4 ans.",
    },

    # ── 9. Kevin Nguyen — Full-stack polyvalent ──────────────────────────────
    {
        "email": "kevin.nguyen@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Kevin Nguyen",
        "resume_profil": (
            "Développeur full-stack avec 10 ans chez Nuance Communications. "
            "Python, JavaScript, SQL, React, REST, FastAPI. "
            "UML et analyse fonctionnelle pour le design de systèmes."
        ),
        "competences": [
            ("Python", CompetenceNiveau.AVANCE),
            ("JavaScript", CompetenceNiveau.AVANCE),
            ("SQL", CompetenceNiveau.INTERMEDIAIRE),
            ("React", CompetenceNiveau.INTERMEDIAIRE),
            ("REST", CompetenceNiveau.AVANCE),
            ("FastAPI", CompetenceNiveau.INTERMEDIAIRE),
            ("HTML/CSS", CompetenceNiveau.INTERMEDIAIRE),
            ("UML", CompetenceNiveau.INTERMEDIAIRE),
            ("Analyse fonctionnelle", CompetenceNiveau.INTERMEDIAIRE),
            ("SQL avancé", CompetenceNiveau.INTERMEDIAIRE),
            ("Optimisation", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Développeur full-stack senior",
                "employeur": "Nuance Communications",
                "annee_debut": 2014,
                "annee_fin": 2024,
                "description_courte": "Applications Python/React, APIs REST, intégration SQL.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "B.Sc. Informatique", "etablissement": "Université Carleton", "annee": 2014, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.C1), ("Anglais", LangueNiveau.NATIF), ("Vietnamien", LangueNiveau.B1)],
        "cv_texte": "Kevin Nguyen — Full-stack. Python, JavaScript, SQL, React, REST, FastAPI, HTML/CSS, UML, Analyse fonctionnelle.",
    },

    # ── 10. Diane Fortin — PostgreSQL · SQL avancé · BDD expert ─────────────
    {
        "email": "diane.fortin@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Diane Fortin",
        "resume_profil": (
            "DBA senior spécialisée PostgreSQL avec 14 ans chez Hydro-Québec. "
            "Experte SQL avancé, optimisation, index, tuning de requêtes. "
            "Formatrice certifiée PostgreSQL et Oracle."
        ),
        "competences": [
            ("PostgreSQL", CompetenceNiveau.EXPERT),
            ("SQL avancé", CompetenceNiveau.EXPERT),
            ("Optimisation", CompetenceNiveau.AVANCE),
            ("Index", CompetenceNiveau.AVANCE),
            ("SQL", CompetenceNiveau.AVANCE),
            ("Modélisation relationnelle", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "DBA senior",
                "employeur": "Hydro-Québec",
                "annee_debut": 2010,
                "annee_fin": 2024,
                "description_courte": "Administration PostgreSQL/Oracle, optimisation SQL, haute disponibilité.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "B.Sc. Génie logiciel", "etablissement": "ETS Montréal", "annee": 2010, "ordre": 0},
            {"diplome": "Oracle Certified Professional DBA", "etablissement": "Oracle", "annee": 2013, "ordre": 1},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.B2)],
        "cv_texte": "Diane Fortin — DBA. PostgreSQL expert, SQL avancé expert, Optimisation, Index, SQL. Hydro-Québec 14 ans.",
    },

    # ── 11. Marc-André Roy — ML + NLP polyvalent ────────────────────────────
    {
        "email": "marc-andre.roy@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "nom_complet": "Marc-André Roy",
        "resume_profil": (
            "Scientifique de données chez Intact Assurance. 8 ans couvrant "
            "ML classique (scikit-learn), deep learning (PyTorch) et NLP (Transformers, Hugging Face). "
            "REST API, Python expert. Enseignement IA en formation continue."
        ),
        "competences": [
            ("Python", CompetenceNiveau.EXPERT),
            ("scikit-learn", CompetenceNiveau.AVANCE),
            ("PyTorch", CompetenceNiveau.AVANCE),
            ("Transformers", CompetenceNiveau.AVANCE),
            ("NLP", CompetenceNiveau.INTERMEDIAIRE),
            ("Statistiques", CompetenceNiveau.INTERMEDIAIRE),
            ("REST", CompetenceNiveau.INTERMEDIAIRE),
            ("GPU", CompetenceNiveau.INTERMEDIAIRE),
            ("Hugging Face", CompetenceNiveau.INTERMEDIAIRE),
            ("Mathématiques", CompetenceNiveau.INTERMEDIAIRE),
        ],
        "experiences": [
            {
                "poste": "Scientifique de données senior",
                "employeur": "Intact Assurance",
                "annee_debut": 2016,
                "annee_fin": 2024,
                "description_courte": "Modèles ML/DL pour la tarification et la détection de fraude.",
                "ordre": 0,
            },
        ],
        "formations": [
            {"diplome": "M.Sc. Informatique (IA)", "etablissement": "Université de Sherbrooke", "annee": 2016, "ordre": 0},
        ],
        "langues": [("Français", LangueNiveau.NATIF), ("Anglais", LangueNiveau.C1)],
        "cv_texte": "Marc-André Roy — ML + NLP. Python expert, scikit-learn, PyTorch, Transformers, NLP, REST, Hugging Face.",
    },
]


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    created = 0
    skipped = 0

    async with SessionLocal() as db:
        for data in PROFS_DATA:
            # ── Vérification idempotence ──────────────────────────────────────
            existing_user = (
                await db.execute(select(User).where(User.email == data["email"]))
            ).scalar_one_or_none()

            if existing_user is not None:
                print(f"[skip] {data['email']} existe déjà")
                skipped += 1
                continue

            # ── Création User (listener crée automatiquement Professeur) ──────
            user = User(
                email=data["email"],
                password_hash=hash_password(data["password"]),
                role=UserRole.PROF,
                nom_complet=data["nom_complet"],
            )
            db.add(user)
            await db.flush()  # déclenche le listener after_insert

            # ── Récupération du Professeur auto-créé ──────────────────────────
            prof = (
                await db.execute(
                    select(Professeur).where(Professeur.user_id == user.id)
                )
            ).scalar_one()

            # ── Mise à jour du résumé profil ──────────────────────────────────
            prof.resume_profil = data["resume_profil"]
            prof.resume_profil_source = SourceOrigine.LLM

            # ── CV avec statut TRAITE ─────────────────────────────────────────
            nom_fichier = f"cv_{data['nom_complet'].lower().replace(' ', '_').replace('-', '_')}.pdf"
            cv = CV(
                professeur_id=prof.id,
                nom_original=nom_fichier,
                chemin_fichier=f"uploads/cv/demo/{nom_fichier}",
                taille_octets=52000,
                mime_type="application/pdf",
                statut=CVStatut.TRAITE,
                texte_brut=data["cv_texte"],
                traite_le=datetime.now(timezone.utc),
            )
            db.add(cv)

            # ── Compétences ───────────────────────────────────────────────────
            for nom, niveau in data["competences"]:
                db.add(Competence(
                    professeur_id=prof.id,
                    nom=nom,
                    niveau=niveau,
                    source=SourceOrigine.LLM,
                ))

            # ── Expériences ───────────────────────────────────────────────────
            for exp_data in data["experiences"]:
                db.add(Experience(
                    professeur_id=prof.id,
                    poste=exp_data["poste"],
                    employeur=exp_data["employeur"],
                    annee_debut=exp_data["annee_debut"],
                    annee_fin=exp_data["annee_fin"],
                    description_courte=exp_data["description_courte"],
                    source=SourceOrigine.LLM,
                    ordre=exp_data["ordre"],
                ))

            # ── Formations ────────────────────────────────────────────────────
            for form_data in data["formations"]:
                db.add(Formation(
                    professeur_id=prof.id,
                    diplome=form_data["diplome"],
                    etablissement=form_data["etablissement"],
                    annee=form_data["annee"],
                    source=SourceOrigine.LLM,
                    ordre=form_data["ordre"],
                ))

            # ── Langues ───────────────────────────────────────────────────────
            for langue_nom, langue_niveau in data["langues"]:
                db.add(Langue(
                    professeur_id=prof.id,
                    langue=langue_nom,
                    niveau=langue_niveau,
                    source=SourceOrigine.LLM,
                ))

            print(f"[create] {data['email']} — {data['nom_complet']} (prof_id={prof.id})")
            created += 1

        await db.commit()

    await engine.dispose()
    print(f"\n[OK] Seed terminé — {created} créés, {skipped} ignorés (déjà existants)")


if __name__ == "__main__":
    asyncio.run(seed())
