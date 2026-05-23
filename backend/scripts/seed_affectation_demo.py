"""Données de démonstration pour la chaîne d'affectation.

Lance avec :  python scripts/seed_affectation_demo.py

Crée (idempotent — skip si déjà présent) :
- Programmes PI (51046) et IAI (51047)
- 4 Étapes par programme
- 10 Cours avec leurs compétences requises
- Session Automne 2026
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
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
        "programme": "51046",
        "competences": [("Python", 5), ("Algorithmique", 4), ("Variables et structures", 3)],
    },
    {
        "code": "25906 IFM", "nom": "Introduction aux bases de données", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("SQL", 5), ("Modélisation relationnelle", 4), ("PostgreSQL", 3)],
    },
    {
        "code": "30742 IFM", "nom": "Analyse et conception de systèmes", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("UML", 4), ("Analyse fonctionnelle", 5), ("Merise", 3)],
    },
    {
        "code": "29990 IFM", "nom": "Introduction à la programmation de serveurs Web", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("FastAPI", 5), ("REST", 5), ("Python", 4), ("JWT", 3)],
    },
    {
        "code": "30746 IFM", "nom": "Bases de données relationnelles avancées", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("SQL avancé", 5), ("Optimisation", 4), ("PostgreSQL", 5), ("Index", 3)],
    },
    {
        "code": "25909 IFM", "nom": "Introduction à la programmation Web client", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("JavaScript", 5), ("HTML/CSS", 4), ("React", 3)],
    },
    {
        "code": "29983 IFM", "nom": "Structures de données appliquées", "credits": 3, "heures": 42,
        "programme": "51046",
        "competences": [("Algorithmes", 5), ("Python", 4), ("Complexité", 4)],
    },
    {
        "code": "IAI-301", "nom": "Machine Learning fondamental", "credits": 3, "heures": 42,
        "programme": "51047",
        "competences": [("Python", 5), ("scikit-learn", 5), ("Statistiques", 4), ("NumPy", 3)],
    },
    {
        "code": "IAI-302", "nom": "Deep Learning et réseaux de neurones", "credits": 3, "heures": 42,
        "programme": "51047",
        "competences": [("PyTorch", 5), ("Python", 5), ("Mathématiques", 4), ("GPU", 3)],
    },
    {
        "code": "IAI-303", "nom": "Traitement du langage naturel", "credits": 3, "heures": 42,
        "programme": "51047",
        "competences": [("NLP", 5), ("Transformers", 5), ("Python", 4), ("Hugging Face", 4)],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        # ── Programmes + Étapes ───────────────────────────────────────────────
        prog_map: dict[str, Programme] = {}
        etape_map: dict[str, int] = {}  # "code:ordre" → etape.id

        for pd in PROGRAMMES:
            existing = (await db.execute(
                select(Programme).where(Programme.code == pd["code"])
            )).scalar_one_or_none()

            if existing:
                prog = existing
                print(f"[skip] Programme {pd['code']} existe déjà (id={prog.id})")
            else:
                prog = Programme(**pd)
                db.add(prog)
                await db.flush()
                print(f"[create] Programme {pd['code']} — {pd['nom']} (id={prog.id})")

                for ordre in range(1, 5):
                    etape = EtapeProgramme(programme_id=prog.id, ordre=ordre, nom=f"Étape {ordre}")
                    db.add(etape)
                    await db.flush()
                    etape_map[f"{pd['code']}:{ordre}"] = etape.id

            prog_map[pd["code"]] = prog

        # Charger les étapes existantes si le programme existait déjà
        for pd in PROGRAMMES:
            if f"{pd['code']}:1" not in etape_map:
                etapes = (await db.execute(
                    select(EtapeProgramme).where(EtapeProgramme.programme_id == prog_map[pd["code"]].id)
                )).scalars().all()
                for e in etapes:
                    etape_map[f"{pd['code']}:{e.ordre}"] = e.id

        # ── Cours + Compétences ───────────────────────────────────────────────
        cours_map: dict[str, Cours] = {}

        for cd in COURS_DATA:
            prog_code = cd["programme"]
            competences = cd["competences"]

            existing = (await db.execute(
                select(Cours).where(Cours.code == cd["code"])
            )).scalar_one_or_none()

            if existing:
                cours = existing
                print(f"[skip] Cours {cd['code']} existe déjà (id={cours.id})")
            else:
                cours = Cours(
                    code=cd["code"],
                    nom=cd["nom"],
                    credits=cd["credits"],
                    heures=cd["heures"],
                    description=f"Cours de {cd['nom'].lower()} — Collège La Cité.",
                )
                db.add(cours)
                await db.flush()
                print(f"[create] Cours {cd['code']} — {cd['nom']} (id={cours.id})")

                for nom_comp, importance in competences:
                    db.add(CoursCompetence(cours_id=cours.id, nom=nom_comp, importance=importance))

            cours_map[cd["code"]] = cours

            # Lier au programme (étape 1 par défaut)
            etape_id = etape_map.get(f"{prog_code}:1")
            if etape_id and prog_map.get(prog_code):
                lien_existing = (await db.execute(
                    select(CoursEtapeProgramme).where(
                        CoursEtapeProgramme.programme_id == prog_map[prog_code].id,
                        CoursEtapeProgramme.cours_id == cours.id,
                    )
                )).scalar_one_or_none()
                if not lien_existing:
                    db.add(CoursEtapeProgramme(
                        programme_id=prog_map[prog_code].id,
                        etape_id=etape_id,
                        cours_id=cours.id,
                        categorie=CategorieCours.OBLIGATOIRE,
                    ))

        # ── Session Automne 2026 ──────────────────────────────────────────────
        sess_existing = (await db.execute(
            select(Session).where(Session.annee == 2026, Session.semestre == Semestre.AUTOMNE)
        )).scalar_one_or_none()

        if sess_existing:
            print(f"[skip] Session Automne 2026 existe déjà (id={sess_existing.id})")
        else:
            sess = Session(annee=2026, semestre=Semestre.AUTOMNE, statut=SessionStatut.OUVERTE)
            db.add(sess)
            await db.flush()
            print(f"[create] Session Automne 2026 (id={sess.id})")

        await db.commit()
        print(f"\n[OK] Seed affectation termine -- {len(COURS_DATA)} cours, 2 programmes, 1 session")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
