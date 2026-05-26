# Cohérence des affectations RH — Plan d'implémentation

> **Pour l'exécution :** TDD strict (test rouge → vert → commit). Branche `fix/affectations-coherence-rh`.

**Goal :** rendre inéligibles à la génération les étapes entièrement affectées, et séparer visuellement les propositions de la génération courante des affectations déjà traitées du programme.

**Règles métier validées :** `VALIDEE` couvre / `REJETEE` ne couvre pas · cours sans candidat (zéro prof au CV traité) = neutralisé/couvert · complétude sur **tous** les cours de l'étape · étape complète = **désactivée + badge** · « déjà traitées » = périmètre **programme** · purge `PROPOSEE` restreinte au périmètre généré.

---

## Tâche 1 — Service : éligibilité des étapes (P1)
- Modify : `backend/app/services/affectation_service.py` (dataclass `EtapeStatut`, `_nb_professeurs_traites`, `lister_etapes_avec_statut`)
- Test : `backend/tests/test_affectation_service.py`
- Couverture : VALIDEE couvre, REJETEE non, isolation session, neutralisation zéro candidat, étape vide non complète.

- [ ] 1.1 Tests rouges
- [ ] 1.2 `pytest -k etape -v` → échec
- [ ] 1.3 Implémenter dataclass + fonctions
- [ ] 1.4 `pytest -k etape -v` → vert
- [ ] 1.5 Commit `feat(algo): calcul d'eligibilite des etapes par session`

## Tâche 2 — Schéma + endpoint éligibilité (P1)
- Modify : `backend/app/schemas/programme.py` (`EtapeStatutOut`), `backend/app/routers/sessions.py` (`GET /{session_id}/programmes/{programme_id}/etapes-statut`)
- Test : `backend/tests/test_sessions_router.py`

- [ ] 2.1 Test rouge
- [ ] 2.2 échec (404)
- [ ] 2.3 Schéma
- [ ] 2.4 Endpoint
- [ ] 2.5 vert
- [ ] 2.6 Commit `feat(api): endpoint statut d'affectation des etapes par session`

## Tâche 3 — Filtres programme_ids/etape_ids sur la liste (P2)
- Modify : `backend/app/routers/affectations.py` (`list_affectations` + `Query`, join `CoursEtapeProgramme`)
- Test : `backend/tests/test_router_affectations.py`

- [ ] 3.1 Test rouge
- [ ] 3.2 échec
- [ ] 3.3 Implémenter
- [ ] 3.4 vert (non-régression incluse)
- [ ] 3.5 Commit `feat(api): filtres programme_ids/etape_ids sur la liste des affectations`

## Tâche 4 — Purge PROPOSEE restreinte au périmètre (P2 / décision 6)
- Modify : `backend/app/services/affectation_service.py` (`generer_affectations`)
- Test : `backend/tests/test_affectation_service.py`

- [ ] 4.1 Test rouge
- [ ] 4.2 échec
- [ ] 4.3 Implémenter purge restreinte à `cours_ids`
- [ ] 4.4 vert
- [ ] 4.5 Couverture ≥ 70 %
- [ ] 4.6 Commit `fix(algo): restreindre la purge des propositions au perimetre genere`

## Tâche 5 — Frontend : types + couche API (P1+P2)
- Modify : `frontend/lib/types/api.ts` (`EtapeStatut`), `frontend/lib/api/affectations.ts` (`sessionsApi.etapesStatut`, `affectationsApi.list` étendu rétro-compatible)

- [ ] 5.1 Type
- [ ] 5.2 API étapes-statut
- [ ] 5.3 `list` avec opts scope
- [ ] 5.4 `tsc --noEmit`
- [ ] 5.5 Commit `feat(frontend): API statut etapes + scope sur la liste d'affectations`

## Tâche 6 — GenerationForm : étapes complètes désactivées (P1)
- Modify : `frontend/components/affectation/GenerationForm.tsx`, `GenerationForm.test.tsx`

- [ ] 6.1 Adapter test + test rouge
- [ ] 6.2 échec
- [ ] 6.3 Implémenter (fetch session-aware, disabled + Badge)
- [ ] 6.4 vert + tsc
- [ ] 6.5 Commit `feat(frontend): desactiver les etapes deja affectees dans le formulaire de generation`

## Tâche 7 — Page review : deux sections distinctes (P2)
- Modify : `frontend/app/dashboard/rh/affectations/page.tsx`
- Create : `frontend/app/dashboard/rh/affectations/__tests__/page.test.tsx`

- [ ] 7.1 Double requête scopée + partition + section « déjà traitées du programme »
- [ ] 7.2 Test partition
- [ ] 7.3 vitest
- [ ] 7.4 lint + tsc
- [ ] 7.5 Commit `feat(frontend): separer generation courante et affectations deja traitees`

## Tâche 8 — Vérification finale
- [ ] backend `pytest --cov=app`
- [ ] frontend `npm run lint && npx tsc --noEmit && npx vitest run`
- [ ] Recette fonctionnelle manuelle (scénario démo)

## Critères d'acceptation
CA1/CA4 → T1-2+6 · CA2 → tests service · CA3 → isolation session · CA5/CA7 → T3+7 · CA6 → T7 (section séparée) · CA8 → ReviewSummary sur propositions courantes.
