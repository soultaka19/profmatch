FROM python:3.12-slim

WORKDIR /app

# Dépendances système (curl pour le healthcheck, build-essential pour asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# PyTorch CPU installé en premier : sentence-transformers dépend de torch et,
# depuis l'index PyPI par défaut, tirerait la version CUDA + ~16 paquets NVIDIA
# (~2,8 Go compressés) inutiles pour un modèle de 90 Mo exécuté sur CPU.
# La roue CPU déjà présente satisfait la contrainte `torch>=2.2` lors de
# l'installation du projet, donc aucune roue CUDA n'est téléchargée.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Dépendances Python : pyproject.toml est l'unique source de vérité (versions
# épinglées). Installation de production uniquement — les dépendances de test
# (`.[dev]`) sont installées par la CI, pas dans l'image.
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Préchargement du modèle d'embeddings (all-MiniLM-L6-v2, voir
# app/services/embeddings.py) dans le cache HuggingFace de l'image : le
# conteneur fonctionne ensuite hors ligne et la première requête (seed démo,
# création de cours, génération d'affectations) n'attend plus le téléchargement.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Code source
COPY . .

# Entrypoint : migrations puis démarrage
# sed normalise les fins de ligne CRLF → LF (cas Windows sans .gitattributes)
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
