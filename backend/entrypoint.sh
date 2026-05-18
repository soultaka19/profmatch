#!/bin/sh
set -e

# Appliquer les migrations au démarrage (backend uniquement, pas le worker)
if [ "$1" = "uvicorn" ]; then
  echo "Applying database migrations..."
  alembic upgrade head
  echo "Migrations applied."
fi

exec "$@"
