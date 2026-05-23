"""Données de démonstration pour la chaîne d'affectation.

Lance avec :  python scripts/seed_affectation_demo.py

Crée :
- Programme 51046 — Programmation informatique (PI)
- Programme 51047 — Intelligence artificielle en informatique (IAI)
- 4 Étapes pour chaque programme
- 10 Cours avec leurs compétences requises
- Session Automne 2026
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import *  # noqa: F401 — enregistre tous les modèles
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme
from app.models.session import Semestre, Session, SessionStatut


PROGRAMMES = [
    {"code": "51046", "nom": "Programmation informatique", "departement": "Informatique"},
    {"code": "51047", "nom": "Intelligence artificielle en informatique", "departement": "IA"},
]

COURS_DATA = [
    {
        "code": "30733 IFM", "nom": "Introduction à la programmation", "credits": 3, "heures": 42,
        "competences": [("Python", 5), ("Algorithmique", 4), ("Variables et structures", 3)],
    },
    {
        "code": "25906 IFM", "nom": "Introduction aux bases de données", "credits": 3, "heures": 42,
        "competences": [("SQL", 5), ("Modélisation relationnelle", 4), ("PostgreSQL", 3)],
    },
    {
        "code": "30742 IFM", "nom": "Analyse et conception de systèmes", "credits": 3, "heures": 42,
        "competences": [("UML", 4), ("Analyse fonctionnelle", 5), ("Merise", 3)],
    },
    {
        "code": "29990 IFM", "nom": "Introduction à la programmation de serveurs Web", "credits": 3, "heures": 42,
        "competences": [("FastAPI", 5), ("REST", 5), ("Python", 4), ("JWT", 3)],
    },
    {
        "code": "30746 IFM", "nom": "Bases de données relationnelles avancées", "credits": 3, "heures": 42,
        "competences": [("SQL avancé", 5), ("Optimisation", 4), ("PostgreSQL", 5), ("Index", 3)],
    },
    {
        "code": "25909 IFM", "nom": "Introduction à la programmation Web client", "credits": 3, "heures": 42,
        "competences": [("JavaScript", 5), ("HTML/CSS", 4), ("React", 3)],
    },
    {
        "code": "29983 IFM", "nom": "Structures de données appliquées", "credits": 3, "heures": 42,
        "competences": [("Algorithmes", 5), ("Python", 4), ("Complexité", 4)],
    },
    {
        "code": "IAI-301", "nom": "Machine Learning fondamental", "credits": 3, "heures": 42,
        "competences": [("Python", 5), ("scikit-learn", 5), ("Statistiques", 4), ("NumPy", 3)],
    },
    {
        "code": "IAI-302", "nom": "Deep Learning et réseaux de neurones", "credits": 3, "heures": 42,
        "competences": [("PyTorch", 5), ("Python", 5), ("Mathématiques", 4), ("GPU", 3)],
    },
    {
        "code": "IAI-303", "nom": "Traitement du langage naturel", "credits": 3, "heures": 42,
        "competences": [("NLP", 5), ("Transformers", 5), ("Python", 4), ("Hugging Face", 4)],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        # Programmes
        programmes = []
        for pd in PROGRAMMES:
            prog = Programme(**pd)
            db.add(prog)
            await db.flush()
            programmes.append(prog)

            # 4 étapes par programme
            for ordre in range(1, 5):
                db.add(EtapeProgramme(programme_id=prog.id, ordre=ordre, nom=f"Étape {ordre}"))

        # Cours
        cours_map = {}
        for cd in COURS_DATA:
            comp_data = cd.pop("competences")
            cours = Cours(**cd, description=f"Cours de {cd['nom'].lower()} au Collège La Cité.")
            db.add(cours)
            await db.flush()
            cours_map[cours.code] = cours

            for nom_comp, importance in comp_data:
                db.add(CoursCompetence(cours_id=cours.id, nom=nom_comp, importance=importance))

        await db.flush()

        # Lier cours PI aux étapes 1-2 du programme PI
        pi_prog = programmes[0]
        pi_cours_codes = ["30733 IFM", "25906 IFM", "30742 IFM", "29990 IFM", "30746 IFM", "25909 IFM", "29983 IFM"]
        for code in pi_cours_codes:
            if code in cours_map:
                db.add(CoursEtapeProgramme(
                    programme_id=pi_prog.id,
                    etape_id=1,  # sera mis à jour — simplifié pour le seed
                    cours_id=cours_map[code].id,
                    categorie=CategorieCours.OBLIGATOIRE,
                ))

        # Lier cours IAI aux étapes du programme IAI
        iai_prog = programmes[1]
        iai_cours_codes = ["IAI-301", "IAI-302", "IAI-303"]
        for code in iai_cours_codes:
            if code in cours_map:
                db.add(CoursEtapeProgramme(
                    programme_id=iai_prog.id,
                    etape_id=1,
                    cours_id=cours_map[code].id,
                    categorie=CategorieCours.OBLIGATOIRE,
                ))

        # Session Automne 2026
        session = Session(annee=2026, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
        db.add(session)

        await db.commit()
        print(f"\n✅ Seed terminé : {len(PROGRAMMES)} programmes, {len(COURS_DATA)} cours, 1 session (A2026)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
