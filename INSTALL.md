# Installation — ProfMatch (jury Défi La Cité 2026)

Application clé en main via Docker. **Une seule commande** suffit.

## Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **ouvert et démarré** (icône verte).
  Windows : activer WSL2 à l'installation.

## Démarrage

```bash
docker compose up --build
```

Premier lancement ~3 min (téléchargement des images). Les migrations de base
de données et les 3 comptes de démo sont créés **automatiquement** au démarrage
(`DEMO_MODE=true` dans le `.env` fourni).

## Accès

| Service | URL |
|---|---|
| Application | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Professeur | `prof@defi-lacite.ca` | `Prof@LaCite2026!` |
| Responsable RH | `rh@defi-lacite.ca` | `Rh@LaCite2026!` |
| Administrateur | `admin@defi-lacite.ca` | `Admin@LaCite2026!` |

## Charger un jeu de données complet (optionnel)

Connecté en **admin**, ouvrir l'espace administrateur → carte **« Données de
démonstration »** → bouton **« Charger les données de démo »** (programmes, cours,
professeurs avec CV traités, affectations avec justifications XAI).

> Alternative en ligne de commande :
> `docker compose exec backend python scripts/seed_affectation_demo.py`

## Arrêt

```bash
docker compose down        # arrêt
docker compose down -v     # arrêt + remise à zéro des données
```

## En cas de souci
- **Docker non démarré** → ouvrir Docker Desktop, attendre l'icône verte, relancer.
- **Port occupé (3000/8000)** → fermer l'application qui l'utilise, relancer.
- Documentation complète : voir `README.md`.
