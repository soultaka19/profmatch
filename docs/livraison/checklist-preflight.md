# Checklist préflight — démo jury (4 juin)

## La veille
- [ ] `git pull` sur `main`, version figée + tag `v1.0`.
- [ ] Vidéo de démo enregistrée et déposée sur le Drive.
- [ ] `.env` de démo prêt (`DEMO_MODE=true`, `SECRET_KEY` dédié, identifiants LLM du PDF).

## 30 min avant le passage
- [ ] Docker Desktop ouvert (icône verte).
- [ ] `docker compose up --build` → attendre les healthchecks.
- [ ] http://localhost:3000 répond.
- [ ] Connexion testée pour les 3 rôles (prof / rh / admin).
- [ ] Données de démo chargées (panneau admin ou script).
- [ ] 1 génération d'affectations à blanc → justifications XAI s'affichent.
- [ ] Sliders W1-W4 → recalcul OK.

## Plan B
- [ ] Vidéo de secours accessible hors ligne si l'API LLM ou le réseau lâche.
