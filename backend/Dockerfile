FROM python:3.12-slim

WORKDIR /app

# Dépendances système (curl pour le healthcheck, build-essential pour asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
# En dev : pip install -e ".[dev]" puis générer requirements.txt avec pip freeze
# En prod : requirements.txt généré et commité
COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[dev]"

# Code source
COPY . .

# Entrypoint : migrations puis démarrage
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
