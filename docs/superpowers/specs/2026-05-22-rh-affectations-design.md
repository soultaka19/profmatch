# Spec — Frontend RH Maquettes 4/5/6

**Date** : 2026-05-22  
**Branche** : `feature/rh-affectations` (depuis `main` après merge PR #13)  
**API source** : PR #13 `feature/affectation-db`

---

## Pages

| Route | Maquette | Rôle | État |
|---|---|---|---|
| `/dashboard/rh/affectations` | 4 + 5 | RH | State machine configure→generating→review |
| `/dashboard/rh/historique` | 6 | RH | Liste sessions + affectations validées |

---

## État machine `/dashboard/rh/affectations`

```
configure  →  saving  →  generating  →  review
                ↑                          ↓
            (erreur PUT)           (erreur génération)
```

Transitions :
- `configure → saving` : bouton "Enregistrer pondérations" cliqué
- `saving → generating` : PUT /ponderations 200 → POST /generer → task_id
- `generating → review` : polling → status==="done"
- `* → error` : n'importe quelle erreur réseau ou API

---

## Data flow

**Phase configure :**
- `GET /api/sessions/` → liste sessions (SWR)
- `GET /api/programmes/` → liste programmes (SWR)
- `GET /api/sessions/{id}/ponderations` → W1-W4 + xai_actif (SWR, déclenché au choix de session)

**Phase saving :**
- `PUT /api/sessions/{id}/ponderations` → { w1, w2, w3, w4 }

**Phase generating :**
- `POST /api/affectations/generer` → { task_id }
- SWR polling `GET /api/affectations/generation/{task_id}` refreshInterval=2000 jusqu'à done|error

**Phase review :**
- `GET /api/affectations/?session_id=X` (SWR)
- `PATCH /api/affectations/{id}` → { statut: "validee"|"rejetee" } (optimistic update)
- `POST /api/affectations/{id}/feedback` → { note, commentaire }

**Maquette 6 (/historique) :**
- `GET /api/sessions/` (SWR)
- Click session → `GET /api/affectations/?session_id=X` (SWR lazy)

---

## Fichiers

### Nouveaux
```
lib/api/affectations.ts             # toutes les fonctions API du domaine
components/affectation/
  WeightSliders.tsx                 # 4 sliders + badge somme (partagé Maquette 8)
  GenerationForm.tsx                # session + programmes + sliders + boutons
  GenerationPoller.tsx              # SWR polling task_id
  AffectationTable.tsx              # groupé par cours_id, trié score desc
  AffectationCard.tsx               # score + XAI expand + valider/rejeter
  ScoreBreakdown.tsx                # mini-bar 4 couleurs W1-W4
app/dashboard/rh/affectations/page.tsx
app/dashboard/rh/historique/page.tsx
```

### Modifiés
```
lib/types/api.ts          # + Session, Programme, GenerationStatus, AffectationOut complet
lib/nav/rhNav.ts          # retirer disabled:true sur affectations + historique
```

---

## Types supplémentaires

```typescript
export interface Session {
  id: number; annee: number; semestre: string; statut: string; nom: string;
}
export interface Programme { id: number; code: string; nom: string; departement: string | null; }
export type GenerationPhase = "queued" | "processing" | "done" | "error";
export interface GenerationStatus { status: GenerationPhase; result?: { session_id: number; nb_affectations: number }; detail?: string; }
export interface AffectationOut {
  id: number; session_id: number; professeur_id: number; cours_id: number;
  score_total: number; score_comp: number; score_exp: number; score_hist: number; score_sem: number;
  justification: string | null; statut: "proposee" | "validee" | "rejetee";
  valide_par_user_id: number | null; valide_le: string | null; cree_le: string;
}
export interface PonderationsOut {
  session_id: number; w1: number; w2: number; w3: number; w4: number; xai_actif: boolean;
}
```

---

## Composants — responsabilités

| Composant | Fait quoi | Props clés |
|---|---|---|
| `WeightSliders` | 4 sliders + badge somme temps réel | `value`, `onChange`, `disabled` |
| `GenerationForm` | orchestration configure→saving→generating | `onDone(sessionId)` |
| `GenerationPoller` | SWR polling task_id → callback | `taskId`, `onDone`, `onError` |
| `AffectationTable` | groupe affectations par cours_id | `affectations`, `onValidate`, `onReject` |
| `AffectationCard` | fiche prof + score + XAI accordion + actions | `affectation`, `onValidate`, `onReject` |
| `ScoreBreakdown` | mini-bar 4 segments colorés | `comp`, `exp`, `hist`, `sem`, `poids` |

---

## Contraintes

- Slider `step=0.01`, range [0.00, 1.00]
- Somme W valide : `|w1+w2+w3+w4 - 1| ≤ 0.001` (badge vert/rouge)
- Bouton "Lancer" désactivé si somme invalide ou aucun programme sélectionné
- SWR polling uniquement pendant la phase `generating` (pas de fuite de polling)
- XAI justification : accordion shadcn/ui (fermé par défaut, ouvert au clic)
- Optimistic update sur valider/rejeter : changer statut local avant réponse API
- Erreurs HTTP → toast shadcn/ui (pattern existant dans le dashboard prof)

---

## Out of scope

- Export rapport PDF/CSV (Maquette 6 mentionne un export — déféré)
- Pagination (MVP : max ~50 affectations par session, acceptable)
- Feedback étoiles inline sur Maquette 5 (déféré — feedback via historique)
- Sliders Admin Maquette 8 (même composant `WeightSliders`, PR séparée)
