Workflow Alembic sécurisé pour créer et valider une migration de base de données.

Description de la migration : $ARGUMENTS

---

## Étape 1 — Vérifier l'état actuel

```bash
# Vérifier la version actuelle de la base
alembic current

# Voir l'historique des migrations
alembic history --verbose

# Voir les migrations en attente
alembic heads
```

Si la base n'est pas à jour (`alembic current` ne correspond pas à `alembic heads`), **arrêter** et appliquer les migrations en attente avec `alembic upgrade head` avant de continuer.

---

## Étape 2 — Identifier les changements de modèles

Analyse les fichiers modifiés dans `backend/app/models/` :

```bash
git diff HEAD -- backend/app/models/
git diff --cached -- backend/app/models/
```

Liste les changements détectés :
- Nouvelles tables
- Nouvelles colonnes (avec leur type et contraintes)
- Colonnes modifiées (type, contrainte, valeur par défaut)
- Colonnes supprimées
- Nouveaux index ou contraintes

**Règle :** si aucun modèle SQLAlchemy n'a été modifié, une migration n'est pas nécessaire. Dans ce cas, arrêter et expliquer pourquoi.

---

## Étape 3 — Valider avant de générer

Vérifie ces points **avant** de générer la migration :

- [ ] L'import du modèle modifié est bien présent dans `alembic/env.py` (via `from app.models import *` ou import explicite)
- [ ] Si une colonne NOT NULL est ajoutée à une table existante, elle doit avoir `server_default` ou `nullable=True` temporairement
- [ ] Si une colonne est supprimée, vérifier qu'aucun service ne l'utilise encore
- [ ] L'enum Python correspond bien à l'enum PostgreSQL attendu

Si un point échoue, signaler le problème et proposer la correction avant de continuer.

---

## Étape 4 — Générer la migration

```bash
cd backend
alembic revision --autogenerate -m "<description_courte>"
```

**Convention de nommage obligatoire :**
- Bon : `add_embedding_to_professeurs`, `create_affectation_feedback_table`, `add_statut_index_to_affectations`
- Mauvais : `auto_1`, `migration_2`, `update`

La description doit être en snake_case et décrire précisément ce qui change.

Si $ARGUMENTS est fourni, utiliser cette description directement.

---

## Étape 5 — Valider le fichier généré

Lis le fichier de migration généré dans `alembic/versions/` et vérifie :

**`upgrade()` :**
- [ ] Les opérations correspondent aux changements de modèles identifiés à l'Étape 2
- [ ] Pas d'opérations inattendues ou manquantes
- [ ] Les types de colonnes sont corrects (PostgreSQL)

**`downgrade()` :**
- [ ] La fonction `downgrade()` est implémentée — **jamais `pass` seul**
- [ ] `downgrade()` annule exactement ce que fait `upgrade()` en ordre inverse
- [ ] Si `upgrade()` crée une table → `downgrade()` la supprime avec `op.drop_table()`
- [ ] Si `upgrade()` ajoute une colonne → `downgrade()` la supprime avec `op.drop_column()`

Si `downgrade()` est vide ou incomplet, le compléter avant de continuer.

---

## Étape 6 — Tester la migration (si possible)

```bash
# Appliquer la migration
alembic upgrade head

# Vérifier que la base est dans l'état attendu
alembic current

# Tester le rollback
alembic downgrade -1

# Vérifier que le rollback s'est bien passé
alembic current

# Ré-appliquer
alembic upgrade head
```

Si une erreur se produit à l'une de ces étapes, **ne pas continuer**. Analyser l'erreur et corriger le fichier de migration.

---

## Étape 7 — Rapport et commit

Présente un résumé de la migration :

```
## Migration générée : <nom_du_fichier>

### Changements appliqués
upgrade() :
- [op 1]
- [op 2]

downgrade() :
- [op 1 inversée]
- [op 2 inversée]

### Validation
- [ ] upgrade() correspond aux changements de modèles
- [ ] downgrade() est complet et correct
- [ ] Migration testée (upgrade + downgrade + upgrade)

### Commande de commit suggérée
```
feat(db): <description_courte>
```

**Important :** committer le fichier de migration ET le fichier de modèle dans le même commit.

```bash
git add backend/app/models/<modele>.py backend/alembic/versions/<migration>.py
git commit -m "feat(db): <description_courte>"
```
