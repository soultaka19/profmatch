# PR-H — Override RH manuel (REV-04) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Permettre au RH d'affecter manuellement un professeur (hors top-3) à un cours, avec score W1–W4 calculé, statut `VALIDEE` immédiat et traçabilité de l'auteur RH.

**Architecture :** Colonne `origine` (`algo|manuel`) sur `affectations` ; refactor du scoring inline en helper `_scorer_paire` réutilisé par la génération **et** la création manuelle ; 2 endpoints RH ; Dialog frontend + badge « Manuel ». La contrainte unique `(session, prof, cours)` impose un upsert.

**Tech Stack :** FastAPI 3.12 · SQLAlchemy 2.0 async · Alembic · Pydantic v2 · pytest/pytest-asyncio · Next.js 16 · React 19 · shadcn/ui · vitest + Testing Library.

**Conventions projet (rappel) :**
- Conventional Commits, scopes `db|algo|api|frontend`. **Aucun trailer `Co-Authored-By`** (convention équipe). Jamais `--no-verify`.
- Branche de travail : `feature/override-rh-manuel` (worktree `C:\workflow\wt-override-rh-manuel`).
- `alembic` : enum créé explicitement (`checkfirst=True`), downgrade complet, nom descriptif.

---

## Pré-requis (une fois, avant Task 1)

- [ ] **Setup & baseline**

```bash
cd /c/workflow/wt-override-rh-manuel/backend && pip install -e . >/dev/null 2>&1 ; pytest -q
cd /c/workflow/wt-override-rh-manuel/frontend && npm install >/dev/null 2>&1 ; npm test -- --run
```
Attendu : suites backend et frontend **vertes** sur main. Si échec → signaler avant de continuer.

---

## Task 1 : Modèle — enum `AffectationOrigine` + colonne `origine`

**Files:**
- Modify: `backend/app/models/affectation.py`
- Test: `backend/tests/test_affectation_model.py`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `backend/tests/test_affectation_model.py` :

```python
@pytest.mark.asyncio
async def test_affectation_origine_defaut_algo(db_session: AsyncSession, professeur_prof: Professeur):
    from app.models.affectation import Affectation, AffectationOrigine
    sess, cours = await _setup(db_session, professeur_prof)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"),
        score_exp=Decimal("0.5"), score_hist=Decimal("0.5"), score_sem=Decimal("0.5"),
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.origine == AffectationOrigine.ALGO
```

(Le fichier importe déjà `Decimal`, `pytest`, `_setup`, `professeur_prof`, `AsyncSession`. Vérifier l'entête ; ajouter `from decimal import Decimal` si absent.)

- [ ] **Step 2 : Lancer le test → échec**

Run: `cd backend && pytest tests/test_affectation_model.py::test_affectation_origine_defaut_algo -v`
Attendu : `ImportError`/`AttributeError` (AffectationOrigine inexistant).

- [ ] **Step 3 : Implémenter le modèle**

Dans `backend/app/models/affectation.py`, après la classe `AffectationStatut` :

```python
class AffectationOrigine(str, Enum):
    ALGO = "algo"       # proposée par l'algorithme de scoring
    MANUEL = "manuel"   # affectée manuellement par le RH
```

Et dans la classe `Affectation`, juste après le champ `statut` (avant `valide_par_user_id`) :

```python
    origine: Mapped[AffectationOrigine] = mapped_column(
        SQLEnum(
            AffectationOrigine,
            name="affectation_origine",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=AffectationOrigine.ALGO,
        server_default=AffectationOrigine.ALGO.value,
    )
```

- [ ] **Step 4 : Lancer le test → succès**

Run: `cd backend && pytest tests/test_affectation_model.py -v`
Attendu : PASS (tous les tests du modèle).

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/models/affectation.py backend/tests/test_affectation_model.py
git commit -m "db: add AffectationOrigine enum and origine column to affectations"
```

---

## Task 2 : Migration Alembic `add_affectation_origine_column`

**Files:**
- Create: `backend/alembic/versions/<auto>_add_affectation_origine_column.py`

- [ ] **Step 1 : Scaffolder la migration vide**

Run: `cd backend && alembic revision -m "add_affectation_origine_column"`
Cela crée un fichier avec `down_revision = '841f44d9c325'` (tête actuelle = migration CV source).

- [ ] **Step 2 : Remplacer `upgrade()` / `downgrade()` par ce corps**

```python
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision / down_revision : conserver ceux générés par le scaffold (down_revision='841f44d9c325')

_origine = sa.Enum("algo", "manuel", name="affectation_origine")


def upgrade() -> None:
    _origine.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "affectations",
        sa.Column(
            "origine",
            _origine,
            nullable=False,
            server_default="algo",
        ),
    )


def downgrade() -> None:
    op.drop_column("affectations", "origine")
    _origine.drop(op.get_bind(), checkfirst=True)
```

- [ ] **Step 3 : Vérifier upgrade puis downgrade puis upgrade**

Run:
```bash
cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head
```
Attendu : aucune erreur ; la table `affectations` possède la colonne `origine` après le dernier `upgrade`.

- [ ] **Step 4 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/alembic/versions/
git commit -m "db: migration add affectation_origine column with server_default algo"
```

---

## Task 3 : Refactor — extraire `_scorer_paire`

**Files:**
- Modify: `backend/app/services/affectation_service.py` (boucle interne de `generer_affectations`, ≈ lignes 209-286)
- Test: `backend/tests/test_affectation_service.py`

- [ ] **Step 1 : Écrire le test du helper (échoue)**

Ajouter dans `backend/tests/test_affectation_service.py` (importer en tête : `from app.services.affectation_service import _scorer_paire` et `from app.services.scoring import PoidsScoring`, déjà présent) :

```python
@pytest.mark.asyncio
async def test_scorer_paire_competence_totale(db_session: AsyncSession, professeur_prof):
    from sqlalchemy import select as _sel
    from sqlalchemy.orm import selectinload
    from app.models.competence import Competence, CompetenceNiveau
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.professeur import Professeur

    db_session.add(Competence(professeur_id=professeur_prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE))
    cours = Cours(code="SC-01", nom="Cours Scoring")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()

    prof = (await db_session.execute(
        _sel(Professeur).where(Professeur.id == professeur_prof.id).options(
            selectinload(Professeur.user),
            selectinload(Professeur.competences),
            selectinload(Professeur.experiences),
        )
    )).scalar_one()
    ccs = (await db_session.execute(
        _sel(CoursCompetence).where(CoursCompetence.cours_id == cours.id)
    )).scalars().all()

    poids = PoidsScoring(w1=Decimal("1"), w2=Decimal("0"), w3=Decimal("0"), w4=Decimal("0"))
    score_total, composants, justification = await _scorer_paire(
        prof, cours, list(ccs), poids, 999, db_session
    )
    assert float(composants.score_comp) == pytest.approx(1.0, abs=0.001)
    assert float(score_total) == pytest.approx(1.0, abs=0.001)
    assert isinstance(justification, str) and justification
```

- [ ] **Step 2 : Lancer → échec**

Run: `cd backend && pytest tests/test_affectation_service.py::test_scorer_paire_competence_totale -v`
Attendu : `ImportError` (`_scorer_paire` n'existe pas).

- [ ] **Step 3 : Implémenter le helper + brancher la génération**

Dans `backend/app/services/affectation_service.py`, ajouter cette fonction **avant** `generer_affectations` :

```python
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
```

Puis remplacer le corps de la boucle `for prof in professeurs:` (les lignes qui calculent W1–W4 et construisent `aff`) par :

```python
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
```

- [ ] **Step 4 : Lancer toute la suite service → succès**

Run: `cd backend && pytest tests/test_affectation_service.py -v`
Attendu : PASS, y compris les tests d'intégration `test_generer_*` (comportement inchangé).

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/services/affectation_service.py backend/tests/test_affectation_service.py
git commit -m "algo: extract _scorer_paire helper from generer_affectations (DRY)"
```

---

## Task 4 : Service — `creer_affectation_manuelle`

**Files:**
- Modify: `backend/app/services/affectation_service.py`
- Test: `backend/tests/test_affectation_service.py`

- [ ] **Step 1 : Écrire les tests (échouent)**

Ajouter dans `backend/tests/test_affectation_service.py`. D'abord un helper de setup en haut de la zone d'intégration :

```python
async def _make_prof_traite(db, email, nom, comps):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.competence import Competence, CompetenceNiveau
    from sqlalchemy import select as _sel

    user = User(email=email, password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet=nom)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    prof = (await db.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
              taille_octets=1, mime_type="application/pdf", statut=CVStatut.TRAITE))
    for c in comps:
        db.add(Competence(professeur_id=prof.id, nom=c, niveau=CompetenceNiveau.AVANCE))
    await db.commit()
    return prof
```

Puis les tests :

```python
@pytest.mark.asyncio
async def test_creer_affectation_manuelle_cree_validee(db_session, test_user_rh):
    from app.models.affectation import AffectationOrigine, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre
    from app.services.affectation_service import creer_affectation_manuelle

    prof = await _make_prof_traite(db_session, "p1@test.ca", "Prof Un", ["Python"])
    cours = Cours(code="M-001", nom="Manuel")
    sess = Session(annee=2031, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()

    aff = await creer_affectation_manuelle(sess.id, prof.id, cours.id, test_user_rh.id, db_session)
    assert aff.statut == AffectationStatut.VALIDEE
    assert aff.origine == AffectationOrigine.MANUEL
    assert aff.valide_par_user_id == test_user_rh.id
    assert aff.valide_le is not None
    assert aff.score_total is not None


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_upsert_sur_existante(db_session, test_user_rh):
    from sqlalchemy import func, select as _sel
    from app.models.affectation import Affectation, AffectationOrigine, AffectationStatut
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre
    from app.services.affectation_service import creer_affectation_manuelle
    from decimal import Decimal

    prof = await _make_prof_traite(db_session, "p2@test.ca", "Prof Deux", ["Python"])
    cours = Cours(code="M-002", nom="Manuel2")
    sess = Session(annee=2032, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=prof.id, cours_id=cours.id,
        score_total=Decimal("0.3"), score_comp=Decimal("0.3"), score_exp=Decimal("0.3"),
        score_hist=Decimal("0.3"), score_sem=Decimal("0.3"), statut=AffectationStatut.PROPOSEE,
    ))
    await db_session.commit()

    aff = await creer_affectation_manuelle(sess.id, prof.id, cours.id, test_user_rh.id, db_session)
    assert aff.statut == AffectationStatut.VALIDEE
    assert aff.origine == AffectationOrigine.MANUEL
    nb = (await db_session.execute(
        _sel(func.count(Affectation.id)).where(
            Affectation.session_id == sess.id,
            Affectation.professeur_id == prof.id,
            Affectation.cours_id == cours.id,
        )
    )).scalar_one()
    assert nb == 1


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_prof_introuvable(db_session, test_user_rh):
    from app.models.session import Session, Semestre
    from app.models.cours import Cours
    from app.services.affectation_service import creer_affectation_manuelle
    cours = Cours(code="M-003", nom="X")
    sess = Session(annee=2033, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    with pytest.raises(ValueError, match="introuvable"):
        await creer_affectation_manuelle(sess.id, 99999, cours.id, test_user_rh.id, db_session)


@pytest.mark.asyncio
async def test_creer_affectation_manuelle_cv_non_traite(db_session, test_user_rh, professeur_prof):
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from app.services.affectation_service import creer_affectation_manuelle
    db_session.add(CV(professeur_id=professeur_prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    cours = Cours(code="M-004", nom="Y")
    sess = Session(annee=2034, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    with pytest.raises(ValueError, match="non traité"):
        await creer_affectation_manuelle(sess.id, professeur_prof.id, cours.id, test_user_rh.id, db_session)
```

- [ ] **Step 2 : Lancer → échec**

Run: `cd backend && pytest tests/test_affectation_service.py -k creer_affectation_manuelle -v`
Attendu : `ImportError` (fonction inexistante).

- [ ] **Step 3 : Implémenter le service**

En tête de `affectation_service.py`, étendre l'import existant :
`from app.models.affectation import Affectation, AffectationOrigine, AffectationStatut`

Ajouter la fonction (après `valider_affectation`) :

```python
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
```

- [ ] **Step 4 : Lancer → succès**

Run: `cd backend && pytest tests/test_affectation_service.py -k creer_affectation_manuelle -v`
Attendu : 4 PASS.

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/services/affectation_service.py backend/tests/test_affectation_service.py
git commit -m "algo: add creer_affectation_manuelle service (manual RH override, REV-04)"
```

---

## Task 5 : Service — `lister_professeurs_disponibles`

**Files:**
- Modify: `backend/app/services/affectation_service.py`
- Test: `backend/tests/test_affectation_service.py`

- [ ] **Step 1 : Écrire les tests (échouent)**

```python
@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_deja_affectes(db_session):
    from decimal import Decimal
    from app.models.affectation import Affectation, AffectationStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from app.services.affectation_service import lister_professeurs_disponibles

    pa = await _make_prof_traite(db_session, "a@test.ca", "Alice", ["Python"])
    pb = await _make_prof_traite(db_session, "b@test.ca", "Bob", ["Java"])
    cours = Cours(code="D-001", nom="Dispo")
    sess = Session(annee=2035, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=pa.id, cours_id=cours.id,
        score_total=Decimal("0.5"), score_comp=Decimal("0.5"), score_exp=Decimal("0.5"),
        score_hist=Decimal("0.5"), score_sem=Decimal("0.5"), statut=AffectationStatut.PROPOSEE,
    ))
    await db_session.commit()

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pb.id in ids
    assert pa.id not in ids


@pytest.mark.asyncio
async def test_lister_profs_dispo_exclut_non_traites(db_session, professeur_prof):
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from app.services.affectation_service import lister_professeurs_disponibles

    # professeur_prof SANS CV traité (statut en_attente)
    db_session.add(CV(professeur_id=professeur_prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    pt = await _make_prof_traite(db_session, "t@test.ca", "Traite", ["SQL"])
    cours = Cours(code="D-002", nom="Dispo2")
    sess = Session(annee=2036, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)

    dispo = await lister_professeurs_disponibles(sess.id, cours.id, db_session)
    ids = [pid for pid, _ in dispo]
    assert pt.id in ids
    assert professeur_prof.id not in ids
```

- [ ] **Step 2 : Lancer → échec**

Run: `cd backend && pytest tests/test_affectation_service.py -k profs_dispo -v`
Attendu : `ImportError`.

- [ ] **Step 3 : Implémenter**

```python
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
```

- [ ] **Step 4 : Lancer → succès**

Run: `cd backend && pytest tests/test_affectation_service.py -k profs_dispo -v`
Attendu : 2 PASS.

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/services/affectation_service.py backend/tests/test_affectation_service.py
git commit -m "algo: add lister_professeurs_disponibles service"
```

---

## Task 6 : Schemas Pydantic

**Files:**
- Modify: `backend/app/schemas/affectation.py`

- [ ] **Step 1 : Ajouter les schémas + champ origine**

En tête, étendre l'import :
`from app.models.affectation import AffectationOrigine, AffectationStatut`

Dans `class AffectationOut`, ajouter le champ (après `statut`) :
```python
    origine: AffectationOrigine
```

Ajouter en fin de section « Affectation » :
```python
class AffectationManuelleCreate(BaseModel):
    session_id: int
    professeur_id: int
    cours_id: int


class ProfesseurDisponibleOut(BaseModel):
    professeur_id: int
    nom_complet: str
```

- [ ] **Step 2 : Vérifier l'import (pas de test dédié — couvert par Task 7)**

Run: `cd backend && python -c "from app.schemas.affectation import AffectationManuelleCreate, ProfesseurDisponibleOut, AffectationOut"`
Attendu : aucun output, exit 0.

- [ ] **Step 3 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/schemas/affectation.py
git commit -m "api: add manual affectation schemas + origine field on AffectationOut"
```

---

## Task 7 : Router — `POST /manuelle` + `GET /professeurs-disponibles`

**Files:**
- Modify: `backend/app/routers/affectations.py`
- Test: `backend/tests/test_router_affectations.py`

⚠️ **Ordre des routes :** déclarer les deux nouvelles routes **avant** `get_affectation` (`GET /{affectation_id}`), sinon `professeurs-disponibles` serait capté par le param int.

- [ ] **Step 1 : Écrire les tests (échouent)**

Ajouter dans `backend/tests/test_router_affectations.py` (réutilise `client`, `db_session`, `auth_headers_rh`). Helper local :

```python
async def _setup_manuel(db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.competence import Competence, CompetenceNiveau
    from app.models.cours import Cours
    from app.models.cours_competence import CoursCompetence
    from app.models.session import Session, Semestre
    from sqlalchemy import select as _sel

    user = User(email="rprof@test.ca", password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet="Router Prof")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    prof = (await db_session.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db_session.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.TRAITE))
    db_session.add(Competence(professeur_id=prof.id, nom="Python", niveau=CompetenceNiveau.AVANCE))
    cours = Cours(code="R-001", nom="RouterCours")
    sess = Session(annee=2040, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    db_session.add(CoursCompetence(cours_id=cours.id, nom="Python", importance=5))
    await db_session.commit()
    return prof, cours, sess


@pytest.mark.asyncio
async def test_post_manuelle_201(client, db_session, auth_headers_rh):
    prof, cours, sess = await _setup_manuel(db_session)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": prof.id, "cours_id": cours.id,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["origine"] == "manuel"
    assert body["statut"] == "validee"
    assert body["professeur_id"] == prof.id


@pytest.mark.asyncio
async def test_post_manuelle_404_prof_inconnu(client, db_session, auth_headers_rh):
    _, cours, sess = await _setup_manuel(db_session)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": 99999, "cours_id": cours.id,
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_post_manuelle_409_cv_non_traite(client, db_session, auth_headers_rh):
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from app.models.professeur import Professeur
    from app.models.cv import CV, CVStatut
    from app.models.cours import Cours
    from app.models.session import Session, Semestre
    from sqlalchemy import select as _sel

    user = User(email="naf@test.ca", password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet="Non Traite")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    prof = (await db_session.execute(_sel(Professeur).where(Professeur.user_id == user.id))).scalar_one()
    db_session.add(CV(professeur_id=prof.id, nom_original="cv.pdf", chemin_fichier="x",
                      taille_octets=1, mime_type="application/pdf", statut=CVStatut.EN_ATTENTE))
    cours = Cours(code="R-002", nom="C2")
    sess = Session(annee=2041, semestre=Semestre.AUTOMNE)
    db_session.add_all([cours, sess])
    await db_session.commit()
    await db_session.refresh(cours)
    await db_session.refresh(sess)
    resp = await client.post("/api/affectations/manuelle", headers=auth_headers_rh, json={
        "session_id": sess.id, "professeur_id": prof.id, "cours_id": cours.id,
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_professeurs_disponibles(client, db_session, auth_headers_rh):
    prof, cours, sess = await _setup_manuel(db_session)
    resp = await client.get(
        f"/api/affectations/professeurs-disponibles?session_id={sess.id}&cours_id={cours.id}",
        headers=auth_headers_rh,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert any(p["professeur_id"] == prof.id for p in body)
```

(Vérifier que `pytest` et `pytest.mark.asyncio` sont importés en tête du fichier de test.)

- [ ] **Step 2 : Lancer → échec**

Run: `cd backend && pytest tests/test_router_affectations.py -k "manuelle or professeurs_disponibles" -v`
Attendu : 404/405 ou erreurs de route (endpoints absents).

- [ ] **Step 3 : Implémenter les routes**

Dans `backend/app/routers/affectations.py`, étendre l'import des schémas :
```python
from app.schemas.affectation import (
    AffectationManuelleCreate,
    AffectationOut,
    AffectationValidateRequest,
    FeedbackCreate,
    FeedbackOut,
    GenererAffectationsRequest,
    GenererAffectationsResponse,
    ProfesseurDisponibleOut,
)
from app.services.affectation_service import (
    ajouter_feedback,
    creer_affectation_manuelle,
    lister_professeurs_disponibles,
    valider_affectation,
)
```

Insérer ces deux routes **juste après** `list_affectations` (le `@router.get("/")`) et **avant** `get_affectation` (le `@router.get("/{affectation_id}")`) :

```python
@router.post(
    "/manuelle",
    response_model=AffectationOut,
    status_code=status.HTTP_201_CREATED,
)
async def creer_affectation_manuelle_endpoint(
    payload: AffectationManuelleCreate,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> AffectationOut:
    """REV-04 : le RH affecte manuellement un professeur à un cours."""
    try:
        aff = await creer_affectation_manuelle(
            payload.session_id, payload.professeur_id, payload.cours_id, current_user.id, db
        )
    except ValueError as exc:
        msg = str(exc)
        code = (
            status.HTTP_409_CONFLICT
            if "non traité" in msg
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=code, detail=msg)

    result = await db.execute(
        select(Affectation).options(*_RELATIONS).where(Affectation.id == aff.id)
    )
    return _to_out(result.scalar_one())


@router.get(
    "/professeurs-disponibles",
    response_model=list[ProfesseurDisponibleOut],
)
async def professeurs_disponibles(
    session_id: int,
    cours_id: int,
    current_user: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> list[ProfesseurDisponibleOut]:
    """Profs avec CV traité non encore affectés à ce (session, cours)."""
    profs = await lister_professeurs_disponibles(session_id, cours_id, db)
    return [
        ProfesseurDisponibleOut(professeur_id=pid, nom_complet=nom)
        for pid, nom in profs
    ]
```

- [ ] **Step 4 : Lancer → succès**

Run: `cd backend && pytest tests/test_router_affectations.py -v`
Attendu : tous PASS (anciens + 4 nouveaux).

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add backend/app/routers/affectations.py backend/tests/test_router_affectations.py
git commit -m "api: add POST /affectations/manuelle and GET /affectations/professeurs-disponibles"
```

---

## Task 8 : Frontend — types

**Files:**
- Modify: `frontend/lib/types/api.ts`

- [ ] **Step 1 : Ajouter origine + ProfesseurDisponibleOut**

Dans `interface AffectationOut`, ajouter (après `statut`) :
```ts
  origine: "algo" | "manuel";
```

Après l'interface `AffectationOut`, ajouter :
```ts
export interface ProfesseurDisponibleOut {
  professeur_id: number;
  nom_complet: string;
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `cd frontend && npx tsc --noEmit`
Attendu : des erreurs UNIQUEMENT dans les fixtures de test `AffectationCard.test.tsx` / `AffectationTable.test.tsx` (champ `origine` manquant) — corrigées aux Tasks 10/12. Aucune erreur dans le code applicatif (`app/`, `components/`, `lib/`).

- [ ] **Step 3 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add frontend/lib/types/api.ts
git commit -m "frontend: add origine to AffectationOut + ProfesseurDisponibleOut type"
```

---

## Task 9 : Frontend — client API

**Files:**
- Modify: `frontend/lib/api/affectations.ts`

- [ ] **Step 1 : Ajouter les méthodes**

Étendre l'import de types :
```ts
import type {
  AffectationOut,
  AffectationStatut,
  EtapeProgramme,
  GenerationResponse,
  GenerationStatus,
  PonderationsOut,
  ProfesseurDisponibleOut,
  Programme,
  Session,
} from "@/lib/types/api";
```

Dans l'objet `affectationsApi`, ajouter :
```ts
  createManuelle: (payload: {
    session_id: number;
    professeur_id: number;
    cours_id: number;
  }): Promise<AffectationOut> =>
    apiClient.post<AffectationOut>("/api/affectations/manuelle", payload),

  listProfesseursDisponibles: (
    sessionId: number,
    coursId: number
  ): Promise<ProfesseurDisponibleOut[]> =>
    apiClient.get<ProfesseurDisponibleOut[]>(
      `/api/affectations/professeurs-disponibles?session_id=${sessionId}&cours_id=${coursId}`
    ),
```

- [ ] **Step 2 : Compilation**

Run: `cd frontend && npx tsc --noEmit`
Attendu : pas de nouvelle erreur hors fixtures de test (cf. Task 8).

- [ ] **Step 3 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add frontend/lib/api/affectations.ts
git commit -m "frontend: add createManuelle + listProfesseursDisponibles api"
```

---

## Task 10 : Frontend — badge « Manuel » sur `AffectationCard`

**Files:**
- Modify: `frontend/components/affectation/AffectationCard.tsx`
- Test: `frontend/components/affectation/AffectationCard.test.tsx`

- [ ] **Step 1 : Mettre à jour la fixture + écrire le test (échoue)**

Dans `AffectationCard.test.tsx`, ajouter `origine: "algo",` à l'objet `aff` (après `statut: "proposee",`). Puis ajouter ce test :

```ts
it("affiche le badge Manuel quand origine = manuel", () => {
  render(
    <AffectationCard
      aff={{ ...aff, origine: "manuel" }}
      poids={poids}
      professorName="Ahmed Diallo"
      onValidate={vi.fn()}
      onReject={vi.fn()}
    />
  );
  expect(screen.getByText("Manuel")).toBeInTheDocument();
});

it("n'affiche pas le badge Manuel quand origine = algo", () => {
  render(
    <AffectationCard
      aff={aff}
      poids={poids}
      professorName="Ahmed Diallo"
      onValidate={vi.fn()}
      onReject={vi.fn()}
    />
  );
  expect(screen.queryByText("Manuel")).not.toBeInTheDocument();
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `cd frontend && npm test -- --run AffectationCard`
Attendu : le test « badge Manuel » échoue (texte absent).

- [ ] **Step 3 : Implémenter le badge**

Dans `AffectationCard.tsx`, remplacer le bloc du badge de statut par un conteneur affichant le badge « Manuel » à côté :

```tsx
        <div className="flex items-center gap-1.5">
          {aff.origine === "manuel" && <Badge variant="outline">Manuel</Badge>}
          <Badge variant={statut.variant}>{statut.label}</Badge>
        </div>
```

(Remplace la ligne `<Badge variant={statut.variant}>{statut.label}</Badge>` seule.)

- [ ] **Step 4 : Lancer → succès**

Run: `cd frontend && npm test -- --run AffectationCard`
Attendu : tous les tests `AffectationCard` PASS.

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add frontend/components/affectation/AffectationCard.tsx frontend/components/affectation/AffectationCard.test.tsx
git commit -m "frontend: show Manuel badge on manually-assigned affectations"
```

---

## Task 11 : Frontend — composant `ManualAssignDialog`

**Files:**
- Create: `frontend/components/affectation/ManualAssignDialog.tsx`
- Test: `frontend/components/affectation/ManualAssignDialog.test.tsx`

> **Note testing :** l'interaction profonde du `Select` Radix (ouverture du portail, sélection d'item) est fragile en jsdom. On teste donc le rendu du déclencheur et l'ouverture du Dialog (titre visible). Le flux complet de confirmation est couvert par le test du client API (Task 9, implicite) et la démo manuelle.

- [ ] **Step 1 : Écrire le test (échoue)**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAssignDialog } from "./ManualAssignDialog";

vi.mock("@/lib/api/affectations", () => ({
  affectationsApi: {
    listProfesseursDisponibles: vi.fn().mockResolvedValue([]),
    createManuelle: vi.fn().mockResolvedValue({}),
  },
}));

describe("ManualAssignDialog", () => {
  it("affiche le bouton déclencheur", () => {
    render(<ManualAssignDialog sessionId={1} coursId={1} onAssigned={vi.fn()} />);
    expect(screen.getByText(/Affecter un autre professeur/i)).toBeInTheDocument();
  });

  it("ouvre le dialog au clic", () => {
    render(<ManualAssignDialog sessionId={1} coursId={1} onAssigned={vi.fn()} />);
    fireEvent.click(screen.getByText(/Affecter un autre professeur/i));
    expect(screen.getByText(/Affecter manuellement un professeur/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `cd frontend && npm test -- --run ManualAssignDialog`
Attendu : échec (module inexistant).

- [ ] **Step 3 : Implémenter le composant**

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { affectationsApi } from "@/lib/api/affectations";
import { ApiError } from "@/lib/api/client";
import type { ProfesseurDisponibleOut } from "@/lib/types/api";
import { toast } from "sonner";

interface ManualAssignDialogProps {
  sessionId: number;
  coursId: number;
  onAssigned: () => void;
}

export function ManualAssignDialog({
  sessionId,
  coursId,
  onAssigned,
}: ManualAssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: profs } = useSWR<ProfesseurDisponibleOut[]>(
    open
      ? `/api/affectations/professeurs-disponibles?session_id=${sessionId}&cours_id=${coursId}`
      : null,
    open ? () => affectationsApi.listProfesseursDisponibles(sessionId, coursId) : null
  );

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await affectationsApi.createManuelle({
        session_id: sessionId,
        professeur_id: Number(selected),
        cours_id: coursId,
      });
      toast.success("Professeur affecté manuellement");
      setOpen(false);
      setSelected("");
      onAssigned();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Ce professeur n'a pas de CV traité."
          : "Échec de l'affectation manuelle.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-1 h-4 w-4" />
          Affecter un autre professeur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter manuellement un professeur</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un professeur disponible" />
          </SelectTrigger>
          <SelectContent>
            {(profs ?? []).map((p) => (
              <SelectItem key={p.professeur_id} value={String(p.professeur_id)}>
                {p.nom_complet}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!selected || submitting}>
            Affecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `cd frontend && npm test -- --run ManualAssignDialog`
Attendu : 2 PASS.

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add frontend/components/affectation/ManualAssignDialog.tsx frontend/components/affectation/ManualAssignDialog.test.tsx
git commit -m "frontend: add ManualAssignDialog component for RH manual override"
```

---

## Task 12 : Frontend — câblage `AffectationTable` + page RH

**Files:**
- Modify: `frontend/components/affectation/AffectationTable.tsx`
- Modify: `frontend/components/affectation/AffectationTable.test.tsx`
- Modify: `frontend/app/dashboard/rh/affectations/page.tsx`

- [ ] **Step 1 : Mettre à jour la fixture du test AffectationTable**

Dans `AffectationTable.test.tsx`, ajouter `origine: "algo",` à chaque objet affectation des fixtures (corrige l'erreur tsc de Task 8). Ajouter aux props requises des rendus existants `sessionId={1}` et `onManualAssigned={vi.fn()}` (voir Step 2 pour la nouvelle signature).

- [ ] **Step 2 : Étendre `AffectationTable` (props + bouton par cours)**

Dans `AffectationTable.tsx` :

a) Importer le dialog en tête :
```tsx
import { ManualAssignDialog } from "./ManualAssignDialog";
```

b) Étendre l'interface de props :
```tsx
interface AffectationTableProps {
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  sessionId: number;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
  onManualAssigned: () => void;
  pendingActionId?: number | null;
  pendingAction?: "validate" | "reject" | null;
}
```
et la signature de la fonction (ajouter `sessionId,` et `onManualAssigned,` dans la déstructuration).

c) Dans l'en-tête de chaque section cours (le `<div className="mb-3 flex items-baseline gap-2">`), ajouter le dialog à droite. Remplacer ce conteneur par :
```tsx
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-fg">{coursName}</h3>
                <span className="text-xs text-fg-muted">
                  {n} candidat{n > 1 ? "s" : ""}
                </span>
              </div>
              <ManualAssignDialog
                sessionId={sessionId}
                coursId={coursId}
                onAssigned={onManualAssigned}
              />
            </div>
```
(Adapter à la structure exacte existante : conserver le `<h3>` et le `<span>` tels quels à l'intérieur du sous-`div`.)

- [ ] **Step 3 : Câbler la page RH**

Dans `app/dashboard/rh/affectations/page.tsx`, au rendu de `<AffectationTable ... />`, ajouter les deux props :
```tsx
            sessionId={sessionId!}
            onManualAssigned={() => mutateAffectations()}
```
(`sessionId` est non-null dans la phase `review` ; `mutateAffectations` est le `mutate` du `useSWR` des affectations.)

- [ ] **Step 4 : Lint + types + tests**

Run:
```bash
cd frontend && npm run lint && npx tsc --noEmit && npm test -- --run
```
Attendu : 0 erreur lint, 0 erreur tsc, tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
cd /c/workflow/wt-override-rh-manuel
git add frontend/components/affectation/AffectationTable.tsx frontend/components/affectation/AffectationTable.test.tsx frontend/app/dashboard/rh/affectations/page.tsx
git commit -m "frontend: wire manual assign dialog into RH affectations table"
```

---

## Task 13 : Vérification finale + PR

- [ ] **Step 1 : Suite backend complète + couverture**

Run:
```bash
cd backend && pytest --cov=app --cov-report=term-missing
```
Attendu : tous PASS ; couverture ≥ 70 % sur `app/services/affectation_service.py`, `app/routers/affectations.py`, `app/schemas/affectation.py`, `app/models/affectation.py`.

- [ ] **Step 2 : Migration aller-retour**

Run: `cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head`
Attendu : aucune erreur.

- [ ] **Step 3 : Frontend qualité**

Run: `cd frontend && npm run lint && npx tsc --noEmit && npm test -- --run`
Attendu : 0 erreur, tests verts.

- [ ] **Step 4 : Pousser la branche**

```bash
cd /c/workflow/wt-override-rh-manuel
git push -u origin feature/override-rh-manuel
```

- [ ] **Step 5 : Ouvrir la PR**

```bash
gh pr create --title "feat(algo+api+frontend): override RH manuel (PR-H, REV-04)" --body "$(cat <<'EOF'
## Résumé
- Colonne `origine` (algo|manuel) sur `affectations` + migration Alembic (server_default=algo)
- Refactor `_scorer_paire` (scoring DRY) réutilisé par génération + override manuel
- Service `creer_affectation_manuelle` (score réel, statut VALIDEE, origine MANUEL, auteur RH, upsert) + `lister_professeurs_disponibles`
- Endpoints RH `POST /api/affectations/manuelle` (201/404/409) et `GET /api/affectations/professeurs-disponibles`
- Front : badge « Manuel », `ManualAssignDialog` (Select profs disponibles), câblage dans `AffectationTable` + page RH

## Plan de test
- pytest service + router : création/upsert/404/409, profs disponibles (exclusions)
- Migration up/down vérifiée
- npm run lint + tsc + vitest (badge Manuel, ouverture Dialog)

Generated with Claude Code
EOF
)"
```

---

## Self-Review (effectué)

- **Couverture spec :** §3 modèle → T1/T2 ; §4.1 refactor → T3 ; §4.2 service → T4 ; §4.3 → T5 ; §5 schemas → T6 ; §6 endpoints → T7 ; §7 front → T8-T12 ; §8 tests → intégrés ; §10 DoD → T13. ✓
- **Placeholders :** aucun ; code complet à chaque step.
- **Cohérence des types :** `_scorer_paire` renvoie `(Decimal, ScoresComposants, str)` utilisé identiquement en T3 et T4 ; `ProfesseurDisponibleOut{professeur_id, nom_complet}` cohérent backend (T6) ↔ types (T8) ↔ usage (T9/T11) ; champ `origine` `"algo"|"manuel"` cohérent partout.
- **Piège routing :** `professeurs-disponibles` déclaré avant `/{affectation_id}` (noté en T7).
