"""
Script de seed des données de démonstration.
À implémenter lors de la feature auth + academic-data.

Usage :
    docker compose exec backend python scripts/seed_demo.py
    # ou en local :
    cd backend && .venv/Scripts/python scripts/seed_demo.py
"""

# TODO : implémenter après la feature auth
# Comptes à créer :
#   prof@lacite.ca  / demo1234  (rôle: prof)
#   rh@lacite.ca    / demo1234  (rôle: rh)
#   admin@lacite.ca / demo1234  (rôle: admin)
#
# Données académiques à créer :
#   - 3 programmes (PI, IAI, Comptabilité)
#   - 10 cours avec compétences requises
#   - 1 session ouverte (Automne 2026)
#   - 3 professeurs avec CV traités
#   - Pondérations par défaut (W1=0.40, W2=0.30, W3=0.20, W4=0.10)

raise NotImplementedError("seed_demo.py — à implémenter après la feature auth")
