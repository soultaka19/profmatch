Génère la description complète d'une Pull Request pour les changements de la branche courante.

Contexte optionnel : $ARGUMENTS (ex: "feature cv-upload" ou numéro de ticket Jira)

---

## Collecte du contexte

Exécute ces commandes pour analyser les changements :

```bash
git branch --show-current
git log main..HEAD --oneline
git diff main...HEAD --stat
git diff main...HEAD
```

---

## Analyse des changements

À partir du diff, identifie :
1. **Domaine(s) touché(s)** : auth · cv · pipeline · algo · frontend · db · docker · ci
2. **Type de changement** : feat / fix / refactor / test / docs / chore
3. **Fichiers modifiés** groupés par couche (models, schemas, services, routers, tests, frontend)
4. **Nouveaux endpoints** ajoutés (méthode + route + rôle requis)
5. **Changements de base de données** (nouvelles tables, colonnes, migrations)
6. **Dépendances modifiées** (pyproject.toml, package.json)

---

## Vérification Definition of Done

Avant de générer la PR, vérifie chaque point :

- [ ] Tous les endpoints du domaine ont un test pytest
- [ ] `pytest --cov=app` ≥ 70% sur les fichiers modifiés (lancer si possible)
- [ ] `npm run lint && npm run type-check` passe sans erreur (lancer si possible)
- [ ] `docs/features/FOR<nom>.md` existe
- [ ] `docs/features/OF<nom>.md` existe
- [ ] Le CLAUDE.md est à jour si une nouvelle convention a été introduite

Si un point n'est pas coché, signale-le **avant** de générer la PR description et demande si on continue quand même.

---

## Génération de la PR

Génère la description au format suivant, prête à copier-coller dans GitHub :

---

**Titre de la PR :**
```
<type>(<scope>): <description en anglais, impératif, max 70 chars>
```

**Corps de la PR :**
```markdown
## Résumé
<!-- 2-4 points résumant ce qui a été fait et pourquoi -->
- 
- 

## Changements techniques
### Backend
- Fichiers modifiés : [liste]
- Nouveaux endpoints :
  | Méthode | Route | Rôle | Description |
  |---|---|---|---|
  | POST | /api/... | rh | ... |

### Frontend
- Composants créés/modifiés : [liste]
- Pages ajoutées/modifiées : [liste]

### Base de données
- Migrations : [nom du fichier de migration ou "aucune"]
- Tables/colonnes ajoutées : [liste ou "aucune"]

## Plan de test
- [ ] `docker compose up --build` démarre sans erreur
- [ ] `pytest --cov=app` passe avec ≥ 70% de couverture
- [ ] `npm run lint && npm run type-check` sans erreur
- [ ] Cas nominal testé manuellement : [décrire]
- [ ] Cas d'erreur testés : [décrire]

## Checklist Definition of Done
- [ ] Tests pytest pour tous les nouveaux endpoints
- [ ] Couverture ≥ 70% sur les fichiers modifiés
- [ ] Lint et type-check frontend sans erreur
- [ ] `docs/features/FOR<nom>.md` créé
- [ ] `docs/features/OF<nom>.md` créé
- [ ] CLAUDE.md mis à jour si nouvelle convention

## Jira
<!-- Lien vers le ticket si applicable -->
DCITE-

## Captures d'écran
<!-- Si changement UI, ajouter des captures avant/après -->
```

---

Présente le titre et le corps séparément pour faciliter le copier-coller.
Rappelle ensuite la commande pour créer la PR avec GitHub CLI :

```bash
gh pr create --title "<titre>" --body "<corps>"
```
