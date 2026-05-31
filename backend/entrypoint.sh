#!/bin/sh
set -e

# Appliquer les migrations au démarrage (backend uniquement, pas le worker)
if [ "$1" = "uvicorn" ]; then
  echo "Applying database migrations..."
  alembic upgrade head
  echo "Migrations applied."

  # Bootstrap des 3 comptes de démonstration (prof/rh/admin) si activé.
  # Idempotent : ne recrée pas de comptes existants. Le jeu de données riche
  # (cours, professeurs avec CV) reste optionnel via le bouton admin.
  # Non bloquant : un échec de seed ne doit pas empêcher le démarrage.
  if [ "$SEED_DEMO_ACCOUNTS_ON_START" = "true" ]; then
    echo "Seeding demo accounts..."
    # PYTHONPATH=/app : le script importe le package `app`. Lancé en fichier,
    # Python met /app/scripts (et non /app) sur le path — d'où un
    # ModuleNotFoundError 'app'. On force /app sur le path.
    PYTHONPATH=/app python scripts/seed_demo.py || echo "Demo accounts seed skipped/failed (non-fatal)."
  fi
fi

exec "$@"
