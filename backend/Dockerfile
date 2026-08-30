FROM python:3.12-slim

WORKDIR /app

# Dépendances système (curl pour le healthcheck, build-essential pour asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python : pyproject.toml est l'unique source de vérité (versions
# épinglées). Installation de production uniquement — les dépendances de test
# (`.[dev]`) sont installées par la CI, pas dans l'image.
#
# Cette image contenait auparavant PyTorch (roue CPU, 920 Mo installés) et le
# modèle d'embeddings all-MiniLM-L6-v2 préchargé, pour le score sémantique W4.
# Le calcul est passé sur l'API du fournisseur (app/services/embeddings.py) :
# l'image perd ~1 Go et le worker ~530 Mo de mémoire résidente, ce qui la fait
# rentrer dans les paliers d'hébergement à 512 Mo.
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Code source
COPY . .

# Entrypoint : migrations puis démarrage
# sed normalise les fins de ligne CRLF → LF (cas Windows sans .gitattributes)
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
