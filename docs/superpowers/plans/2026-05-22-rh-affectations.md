# RH Affectations Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les Maquettes 4/5/6 du dashboard RH — génération des affectations avec sliders W1-W4, révision des propositions avec justifications XAI, et historique des sessions.

**Architecture:** State machine à 5 états (`configure → saving → generating → review → error`) dans la page `/dashboard/rh/affectations`, avec polling SWR sur le task_id Celery. Composants isolés réutilisables (`WeightSliders` partageable avec Admin Maquette 8). API centralisée dans `lib/api/affectations.ts`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, SWR, shadcn/ui (Accordion, Badge, Button, Select), @radix-ui/react-slider, Tailwind CSS, Vitest + @testing-library/react.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `lib/types/api.ts` | Modify | + Session, Programme, PonderationsOut, AffectationOut, GenerationStatus |
| `lib/api/affectations.ts` | Create | Toutes les fonctions API du domaine (sessions, programmes, affectations) |
| `lib/hooks/useGenerationPoller.ts` | Create | SWR polling sur task_id |
| `components/ui/slider.tsx` | Create | shadcn/ui Slider wrapping @radix-ui/react-slider |
| `components/affectation/WeightSliders.tsx` | Create | 4 sliders W1-W4 + badge somme |
| `components/affectation/WeightSliders.test.tsx` | Create | Tests unitaires sliders |
| `components/affectation/ScoreBreakdown.tsx` | Create | Mini-barre 4 couleurs W1-W4 |
| `components/affectation/ScoreBreakdown.test.tsx` | Create | Tests unitaires bar |
| `components/affectation/AffectationCard.tsx` | Create | Fiche prof + scores + XAI accordion + actions |
| `components/affectation/AffectationCard.test.tsx` | Create | Tests unitaires card |
| `components/affectation/AffectationTable.tsx` | Create | Table groupée par cours_id |
| `components/affectation/AffectationTable.test.tsx` | Create | Tests groupement + affichage |
| `components/affectation/GenerationForm.tsx` | Create | Session + programmes + sliders + boutons |
| `app/dashboard/rh/affectations/page.tsx` | Create | State machine configure→review |
| `app/dashboard/rh/historique/page.tsx` | Create | Liste sessions + détail |
| `lib/nav/rhNav.ts` | Modify | Retirer `disabled: true` sur affectations + historique |

---

## Task 0 : Branche + dépendances + types API

**Files:**
- Modify: `lib/types/api.ts`
- Modify: `package.json`

- [ ] **Step 1 : Créer la branche depuis feature/affectation-db**

> PR #13 n'est pas encore mergée — on branche depuis `feature/affectation-db` pour avoir l'API locale. Rebase sur `main` après le merge de #13.

```bash
cd C:/workflow/defis-cite/profmatch
git checkout feature/affectation-db
git checkout -b feature/rh-affectations
```

Expected : `Switched to a new branch 'feature/rh-affectations'`

- [ ] **Step 2 : Installer @radix-ui/react-slider**

```bash
cd frontend && npm install @radix-ui/react-slider
```

Expected : ajout de `@radix-ui/react-slider` dans `package.json` dependencies.

- [ ] **Step 3 : Ajouter les types dans `lib/types/api.ts`**

Ajouter à la fin de `frontend/lib/types/api.ts` :

```typescript
// ── Sessions ─────────────────────────────────────────────────────────────────

export type Semestre = "printemps" | "ete" | "automne" | "hiver";
export type SessionStatut = "planifiee" | "ouverte" | "fermee";

export interface Session {
  id: number;
  annee: number;
  semestre: Semestre;
  statut: SessionStatut;
  nom: string;
  cree_le: string;
}

// ── Programmes ────────────────────────────────────────────────────────────────

export interface Programme {
  id: number;
  code: string;
  nom: string;
  departement: string | null;
}

// ── Pondérations ─────────────────────────────────────────────────────────────

export interface PonderationsOut {
  session_id: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  xai_actif: boolean;
  mis_a_jour_le: string;
}

// ── Affectations (complet) ────────────────────────────────────────────────────

export type AffectationStatut = "proposee" | "validee" | "rejetee";

export interface AffectationOut {
  id: number;
  session_id: number;
  professeur_id: number;
  cours_id: number;
  score_total: number;
  score_comp: number;
  score_exp: number;
  score_hist: number;
  score_sem: number;
  justification: string | null;
  statut: AffectationStatut;
  valide_par_user_id: number | null;
  valide_le: string | null;
  cree_le: string;
}

// ── Génération ────────────────────────────────────────────────────────────────

export type GenerationPhase = "queued" | "processing" | "done" | "error";

export interface GenerationStatus {
  status: GenerationPhase;
  result?: { session_id: number; nb_affectations: number };
  detail?: string;
}

export interface GenerationResponse {
  task_id: string;
  message: string;
}
```

- [ ] **Step 4 : Vérifier que TypeScript compile**

```bash
cd frontend && npm run type-check
```

Expected : 0 erreur sur les types ajoutés.

- [ ] **Step 5 : Commit**

```bash
git add frontend/lib/types/api.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add affectation types and install radix-ui-slider"
```

---

## Task 1 : Couche API — `lib/api/affectations.ts`

**Files:**
- Create: `frontend/lib/api/affectations.ts`

- [ ] **Step 1 : Créer le fichier API**

Create `frontend/lib/api/affectations.ts` :

```typescript
import { apiClient } from "./client";
import type {
  AffectationOut,
  AffectationStatut,
  GenerationResponse,
  GenerationStatus,
  PonderationsOut,
  Programme,
  Session,
} from "@/lib/types/api";

export const sessionsApi = {
  list: (): Promise<Session[]> =>
    apiClient.get<Session[]>("/api/sessions/"),

  getPonderations: (sessionId: number): Promise<PonderationsOut> =>
    apiClient.get<PonderationsOut>(`/api/sessions/${sessionId}/ponderations`),

  updatePonderations: (
    sessionId: number,
    weights: { w1: number; w2: number; w3: number; w4: number }
  ): Promise<PonderationsOut> =>
    apiClient.put<PonderationsOut>(
      `/api/sessions/${sessionId}/ponderations`,
      weights
    ),
};

export const programmesApi = {
  list: (): Promise<Programme[]> =>
    apiClient.get<Programme[]>("/api/programmes/"),
};

export const affectationsApi = {
  generer: (sessionId: number, programmeIds: number[]): Promise<GenerationResponse> =>
    apiClient.post<GenerationResponse>("/api/affectations/generer", {
      session_id: sessionId,
      programme_ids: programmeIds,
    }),

  getGenerationStatus: (taskId: string): Promise<GenerationStatus> =>
    apiClient.get<GenerationStatus>(`/api/affectations/generation/${taskId}`),

  list: (sessionId: number, statut?: AffectationStatut): Promise<AffectationOut[]> => {
    const params = new URLSearchParams({ session_id: String(sessionId) });
    if (statut) params.set("statut", statut);
    return apiClient.get<AffectationOut[]>(`/api/affectations/?${params}`);
  },

  validate: (
    id: number,
    statut: "validee" | "rejetee"
  ): Promise<AffectationOut> =>
    apiClient.patch<AffectationOut>(`/api/affectations/${id}`, { statut }),

  addFeedback: (
    id: number,
    note: number,
    commentaire?: string
  ): Promise<{ id: number; note: number }> =>
    apiClient.post(`/api/affectations/${id}/feedback`, { note, commentaire }),
};
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd frontend && npm run type-check
```

Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/lib/api/affectations.ts
git commit -m "feat(frontend): add affectations API layer (sessions, programmes, affectations)"
```

---

## Task 2 : Slider UI + WeightSliders

**Files:**
- Create: `frontend/components/ui/slider.tsx`
- Create: `frontend/components/affectation/WeightSliders.tsx`
- Create: `frontend/components/affectation/WeightSliders.test.tsx`

- [ ] **Step 1 : Créer le composant Slider shadcn/ui**

Create `frontend/components/ui/slider.tsx` :

```typescript
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
```

- [ ] **Step 2 : Écrire le test échouant pour WeightSliders**

Create `frontend/components/affectation/WeightSliders.test.tsx` :

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeightSliders } from "./WeightSliders";

const defaultWeights = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("WeightSliders", () => {
  it("affiche les 4 labels W1-W4", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    expect(screen.getByText(/W1/)).toBeInTheDocument();
    expect(screen.getByText(/W2/)).toBeInTheDocument();
    expect(screen.getByText(/W3/)).toBeInTheDocument();
    expect(screen.getByText(/W4/)).toBeInTheDocument();
  });

  it("badge vert quand somme = 1.000", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    // badge affiche "1.000" et est vert (variant default)
    expect(screen.getByText("1.000")).toBeInTheDocument();
  });

  it("badge rouge quand somme ≠ 1.000", () => {
    render(
      <WeightSliders
        value={{ w1: 0.5, w2: 0.5, w3: 0.5, w4: 0.5 }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("2.000")).toBeInTheDocument();
    // Le badge destructive est affiché
    const badge = screen.getByText("2.000").closest("[class*='destructive']");
    expect(badge).toBeTruthy();
  });

  it("est désactivé en mode disabled", () => {
    render(
      <WeightSliders value={defaultWeights} onChange={vi.fn()} disabled />
    );
    const sliders = document.querySelectorAll('[role="slider"]');
    sliders.forEach((s) =>
      expect(s).toHaveAttribute("aria-disabled", "true")
    );
  });

  it("affiche les descriptions W1-W4", () => {
    render(<WeightSliders value={defaultWeights} onChange={vi.fn()} />);
    expect(screen.getByText(/Compétences/i)).toBeInTheDocument();
    expect(screen.getByText(/Expérience/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    expect(screen.getByText(/Sémantique/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

```bash
cd frontend && npm test -- WeightSliders
```

Expected : `Cannot find module './WeightSliders'`

- [ ] **Step 4 : Implémenter WeightSliders**

Create `frontend/components/affectation/WeightSliders.tsx` :

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export interface Weights {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface WeightSlidersProps {
  value: Weights;
  onChange: (weights: Weights) => void;
  disabled?: boolean;
}

const WEIGHT_LABELS: { key: keyof Weights; label: string; description: string; color: string }[] = [
  { key: "w1", label: "W1", description: "Compétences", color: "bg-blue-500" },
  { key: "w2", label: "W2", description: "Expérience", color: "bg-green-500" },
  { key: "w3", label: "W3", description: "Historique", color: "bg-orange-500" },
  { key: "w4", label: "W4", description: "Sémantique", color: "bg-purple-500" },
];

export function WeightSliders({ value, onChange, disabled = false }: WeightSlidersProps) {
  const sum = value.w1 + value.w2 + value.w3 + value.w4;
  const isValid = Math.abs(sum - 1) <= 0.001;

  function handleChange(key: keyof Weights, newVal: number) {
    onChange({ ...value, [key]: Math.round(newVal * 100) / 100 });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">Pondérations W1–W4</span>
        <Badge variant={isValid ? "default" : "destructive"}>
          {sum.toFixed(3)}
        </Badge>
      </div>
      {!isValid && (
        <p className="text-xs text-destructive">
          La somme doit être égale à 1.000 (± 0.001)
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WEIGHT_LABELS.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-fg">
                {label} — {description}
              </span>
              <span className="text-fg-muted tabular-nums">
                {(value[key] * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[value[key]]}
              onValueChange={([v]) => handleChange(key, v)}
              min={0}
              max={1}
              step={0.01}
              disabled={disabled}
              aria-label={`${label} ${description}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5 : Lancer les tests**

```bash
cd frontend && npm test -- WeightSliders
```

Expected : 5 tests PASS.

- [ ] **Step 6 : Commit**

```bash
git add frontend/components/ui/slider.tsx frontend/components/affectation/WeightSliders.tsx frontend/components/affectation/WeightSliders.test.tsx
git commit -m "feat(frontend): add WeightSliders with W1-W4 sliders and sum validation"
```

---

## Task 3 : ScoreBreakdown

**Files:**
- Create: `frontend/components/affectation/ScoreBreakdown.tsx`
- Create: `frontend/components/affectation/ScoreBreakdown.test.tsx`

- [ ] **Step 1 : Écrire le test**

Create `frontend/components/affectation/ScoreBreakdown.test.tsx` :

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBreakdown } from "./ScoreBreakdown";

const scores = { comp: 0.857, exp: 0.75, hist: 0.9, sem: 0.92 };
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("ScoreBreakdown", () => {
  it("affiche le score global en %", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("affiche les 4 segments de couleur", () => {
    const { container } = render(
      <ScoreBreakdown scores={scores} poids={poids} total={0.84} />
    );
    // 4 divs de couleur dans la barre
    const segments = container.querySelectorAll("[style*='width']");
    expect(segments.length).toBeGreaterThanOrEqual(4);
  });

  it("affiche Fortement recommandé pour score ≥ 0.8", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.84} />);
    expect(screen.getByText(/Fortement recommandé/i)).toBeInTheDocument();
  });

  it("affiche Recommandé avec réserves pour score entre 0.6 et 0.8", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.72} />);
    expect(screen.getByText(/Recommandé avec réserves/i)).toBeInTheDocument();
  });

  it("affiche À examiner pour score < 0.6", () => {
    render(<ScoreBreakdown scores={scores} poids={poids} total={0.45} />);
    expect(screen.getByText(/À examiner/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
cd frontend && npm test -- ScoreBreakdown
```

Expected : `Cannot find module './ScoreBreakdown'`

- [ ] **Step 3 : Implémenter ScoreBreakdown**

Create `frontend/components/affectation/ScoreBreakdown.tsx` :

```typescript
import { Badge } from "@/components/ui/badge";

interface Scores {
  comp: number;
  exp: number;
  hist: number;
  sem: number;
}

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface ScoreBreakdownProps {
  scores: Scores;
  poids: Poids;
  total: number;
}

const SEGMENTS = [
  { key: "comp" as keyof Scores, poids: "w1" as keyof Poids, color: "#3b82f6", label: "Comp." },
  { key: "exp" as keyof Scores, poids: "w2" as keyof Poids, color: "#22c55e", label: "Exp." },
  { key: "hist" as keyof Scores, poids: "w3" as keyof Poids, color: "#f97316", label: "Hist." },
  { key: "sem" as keyof Scores, poids: "w4" as keyof Poids, color: "#a855f7", label: "Sém." },
];

function recommendation(total: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (total >= 0.8) return { label: "Fortement recommandé", variant: "default" };
  if (total >= 0.6) return { label: "Recommandé avec réserves", variant: "secondary" };
  return { label: "À examiner", variant: "outline" };
}

export function ScoreBreakdown({ scores, poids, total }: ScoreBreakdownProps) {
  const reco = recommendation(total);
  const pct = Math.round(total * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-fg tabular-nums">{pct}%</span>
        <Badge variant={reco.variant}>{reco.label}</Badge>
      </div>
      {/* Barre 4 segments */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        {SEGMENTS.map(({ key, poids: pKey, color }) => {
          const contribution = scores[key] * poids[pKey];
          return (
            <div
              key={key}
              style={{ width: `${contribution * 100}%`, backgroundColor: color }}
              title={`${key}: ${Math.round(scores[key] * 100)}%`}
            />
          );
        })}
      </div>
      {/* Légende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {SEGMENTS.map(({ key, color, label }) => (
          <span key={key} className="flex items-center gap-1 text-xs text-fg-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {label} {Math.round(scores[key] * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd frontend && npm test -- ScoreBreakdown
```

Expected : 5 PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/affectation/ScoreBreakdown.tsx frontend/components/affectation/ScoreBreakdown.test.tsx
git commit -m "feat(frontend): add ScoreBreakdown bar with W1-W4 color segments"
```

---

## Task 4 : AffectationCard

**Files:**
- Create: `frontend/components/affectation/AffectationCard.tsx`
- Create: `frontend/components/affectation/AffectationCard.test.tsx`

- [ ] **Step 1 : Écrire le test**

Create `frontend/components/affectation/AffectationCard.test.tsx` :

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AffectationCard } from "./AffectationCard";
import type { AffectationOut } from "@/lib/types/api";

const aff: AffectationOut = {
  id: 1, session_id: 1, professeur_id: 42, cours_id: 10,
  score_total: 0.84, score_comp: 0.857, score_exp: 0.75,
  score_hist: 0.9, score_sem: 0.92,
  justification: "• Compétences : Maîtrise de React. • Expérience : 9 ans.",
  statut: "proposee",
  valide_par_user_id: null, valide_le: null,
  cree_le: "2026-05-22T00:00:00Z",
};
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };
const professorName = "Ahmed Diallo";

describe("AffectationCard", () => {
  it("affiche le nom du professeur", () => {
    render(
      <AffectationCard aff={aff} poids={poids} professorName={professorName}
        onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText("Ahmed Diallo")).toBeInTheDocument();
  });

  it("affiche le score global", () => {
    render(
      <AffectationCard aff={aff} poids={poids} professorName={professorName}
        onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("ouvre la justification XAI au clic", () => {
    render(
      <AffectationCard aff={aff} poids={poids} professorName={professorName}
        onValidate={vi.fn()} onReject={vi.fn()} />
    );
    fireEvent.click(screen.getByText(/Justification IA/i));
    expect(screen.getByText(/Maîtrise de React/i)).toBeInTheDocument();
  });

  it("appelle onValidate au clic Valider", () => {
    const onValidate = vi.fn();
    render(
      <AffectationCard aff={aff} poids={poids} professorName={professorName}
        onValidate={onValidate} onReject={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(onValidate).toHaveBeenCalledWith(1);
  });

  it("appelle onReject au clic Rejeter", () => {
    const onReject = vi.fn();
    render(
      <AffectationCard aff={aff} poids={poids} professorName={professorName}
        onValidate={vi.fn()} onReject={onReject} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Rejeter/i }));
    expect(onReject).toHaveBeenCalledWith(1);
  });

  it("masque les boutons si statut != proposee", () => {
    render(
      <AffectationCard aff={{ ...aff, statut: "validee" }} poids={poids}
        professorName={professorName} onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: /Valider/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rejeter/i })).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
cd frontend && npm test -- AffectationCard
```

Expected : `Cannot find module './AffectationCard'`

- [ ] **Step 3 : Implémenter AffectationCard**

Create `frontend/components/affectation/AffectationCard.tsx` :

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { Check, X, Sparkles } from "lucide-react";
import type { AffectationOut } from "@/lib/types/api";

interface Poids {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface AffectationCardProps {
  aff: AffectationOut;
  poids: Poids;
  professorName: string;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
}

const STATUT_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  proposee: { label: "Proposée", variant: "secondary" },
  validee: { label: "Validée", variant: "default" },
  rejetee: { label: "Rejetée", variant: "destructive" },
};

export function AffectationCard({
  aff, poids, professorName, onValidate, onReject,
}: AffectationCardProps) {
  const statut = STATUT_BADGE[aff.statut] ?? STATUT_BADGE.proposee;

  return (
    <div className="rounded-lg border border-border bg-canvas-pure p-4 shadow-sm space-y-3">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-fg">{professorName}</p>
          <p className="text-xs text-fg-muted">Professeur #{aff.professeur_id}</p>
        </div>
        <Badge variant={statut.variant}>{statut.label}</Badge>
      </div>

      {/* Scores */}
      <ScoreBreakdown
        scores={{
          comp: aff.score_comp,
          exp: aff.score_exp,
          hist: aff.score_hist,
          sem: aff.score_sem,
        }}
        poids={poids}
        total={aff.score_total}
      />

      {/* Justification XAI */}
      {aff.justification && (
        <Accordion type="single" collapsible>
          <AccordionItem value="xai" className="border-none">
            <AccordionTrigger className="py-1 text-sm text-fg-muted hover:text-fg">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Justification IA
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-line text-sm text-fg-muted leading-relaxed">
                {aff.justification}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Actions (seulement si proposee) */}
      {aff.statut === "proposee" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onValidate(aff.id)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(aff.id)}
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Rejeter
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd frontend && npm test -- AffectationCard
```

Expected : 6 PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/affectation/AffectationCard.tsx frontend/components/affectation/AffectationCard.test.tsx
git commit -m "feat(frontend): add AffectationCard with XAI accordion and validate/reject actions"
```

---

## Task 5 : AffectationTable

**Files:**
- Create: `frontend/components/affectation/AffectationTable.tsx`
- Create: `frontend/components/affectation/AffectationTable.test.tsx`

- [ ] **Step 1 : Écrire le test**

Create `frontend/components/affectation/AffectationTable.test.tsx` :

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AffectationTable } from "./AffectationTable";
import type { AffectationOut } from "@/lib/types/api";

const makeAff = (id: number, cours_id: number, score: number): AffectationOut => ({
  id, session_id: 1, professeur_id: id * 10, cours_id,
  score_total: score, score_comp: 0.8, score_exp: 0.7, score_hist: 0.9, score_sem: 0.85,
  justification: null, statut: "proposee",
  valide_par_user_id: null, valide_le: null, cree_le: "2026-05-22T00:00:00Z",
});

const affectations = [
  makeAff(1, 10, 0.84),
  makeAff(2, 10, 0.72),
  makeAff(3, 20, 0.91),
];

const coursNames: Record<number, string> = { 10: "PI-301 Algorithmes", 20: "IAI-301 ML" };
const professorNames: Record<number, string> = { 10: "Ahmed Diallo", 20: "Fatou Ba", 30: "Luc Martin" };
const poids = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

describe("AffectationTable", () => {
  it("groupe les affectations par cours", () => {
    render(
      <AffectationTable affectations={affectations} coursNames={coursNames}
        professorNames={professorNames} poids={poids}
        onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText("PI-301 Algorithmes")).toBeInTheDocument();
    expect(screen.getByText("IAI-301 ML")).toBeInTheDocument();
  });

  it("affiche le bon nombre d'affectations par cours", () => {
    render(
      <AffectationTable affectations={affectations} coursNames={coursNames}
        professorNames={professorNames} poids={poids}
        onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText("2 candidats")).toBeInTheDocument();
    expect(screen.getByText("1 candidat")).toBeInTheDocument();
  });

  it("affiche un message si aucune affectation", () => {
    render(
      <AffectationTable affectations={[]} coursNames={{}} professorNames={{}}
        poids={poids} onValidate={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText(/aucune proposition/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
cd frontend && npm test -- AffectationTable
```

Expected : `Cannot find module './AffectationTable'`

- [ ] **Step 3 : Implémenter AffectationTable**

Create `frontend/components/affectation/AffectationTable.tsx` :

```typescript
"use client";

import { AffectationCard } from "./AffectationCard";
import type { AffectationOut } from "@/lib/types/api";

interface Poids { w1: number; w2: number; w3: number; w4: number; }

interface AffectationTableProps {
  affectations: AffectationOut[];
  coursNames: Record<number, string>;
  professorNames: Record<number, string>;
  poids: Poids;
  onValidate: (id: number) => void;
  onReject: (id: number) => void;
}

export function AffectationTable({
  affectations, coursNames, professorNames, poids, onValidate, onReject,
}: AffectationTableProps) {
  if (affectations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Aucune proposition d&apos;affectation générée.
      </p>
    );
  }

  // Grouper par cours_id, trier chaque groupe par score desc
  const groups = affectations.reduce<Record<number, AffectationOut[]>>((acc, aff) => {
    if (!acc[aff.cours_id]) acc[aff.cours_id] = [];
    acc[aff.cours_id].push(aff);
    return acc;
  }, {});

  Object.values(groups).forEach((group) =>
    group.sort((a, b) => b.score_total - a.score_total)
  );

  const coursIds = Object.keys(groups).map(Number).sort();

  return (
    <div className="space-y-8">
      {coursIds.map((coursId) => {
        const group = groups[coursId];
        const coursName = coursNames[coursId] ?? `Cours #${coursId}`;
        const n = group.length;

        return (
          <section key={coursId}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-fg">{coursName}</h3>
              <span className="text-xs text-fg-muted">
                {n} candidat{n > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((aff) => (
                <AffectationCard
                  key={aff.id}
                  aff={aff}
                  poids={poids}
                  professorName={professorNames[aff.professeur_id] ?? `Prof #${aff.professeur_id}`}
                  onValidate={onValidate}
                  onReject={onReject}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd frontend && npm test -- AffectationTable
```

Expected : 3 PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/affectation/AffectationTable.tsx frontend/components/affectation/AffectationTable.test.tsx
git commit -m "feat(frontend): add AffectationTable grouped by cours with top-3 display"
```

---

## Task 6 : GenerationForm + GenerationPoller hook

**Files:**
- Create: `frontend/lib/hooks/useGenerationPoller.ts`
- Create: `frontend/components/affectation/GenerationForm.tsx`

- [ ] **Step 1 : Créer le hook useGenerationPoller**

Create `frontend/lib/hooks/useGenerationPoller.ts` :

```typescript
"use client";

import useSWR from "swr";
import { affectationsApi } from "@/lib/api/affectations";
import type { GenerationStatus } from "@/lib/types/api";

/**
 * Polling SWR sur le statut d'une tâche Celery de génération.
 * Arrête automatiquement quand status === "done" | "error".
 */
export function useGenerationPoller(taskId: string | null) {
  return useSWR<GenerationStatus>(
    taskId ? `/api/affectations/generation/${taskId}` : null,
    taskId ? () => affectationsApi.getGenerationStatus(taskId) : null,
    {
      refreshInterval: (data) =>
        !data || data.status === "done" || data.status === "error" ? 0 : 2000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
}
```

- [ ] **Step 2 : Créer GenerationForm**

Create `frontend/components/affectation/GenerationForm.tsx` :

```typescript
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WeightSliders } from "./WeightSliders";
import type { Programme, PonderationsOut, Session } from "@/lib/types/api";
import { sessionsApi, programmesApi } from "@/lib/api/affectations";
import { Loader2, Sparkles } from "lucide-react";

interface GenerationFormProps {
  onTaskStarted: (taskId: string, sessionId: number) => void;
}

export function GenerationForm({ onTaskStarted }: GenerationFormProps) {
  const { data: sessions } = useSWR<Session[]>("/api/sessions/", sessionsApi.list);
  const { data: programmes } = useSWR<Programme[]>("/api/programmes/", programmesApi.list);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<Set<number>>(new Set());
  const [weights, setWeights] = useState({ w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les pondérations quand la session change
  const { data: ponderations } = useSWR<PonderationsOut>(
    selectedSessionId ? `/api/sessions/${selectedSessionId}/ponderations` : null,
    selectedSessionId ? () => sessionsApi.getPonderations(selectedSessionId) : null
  );

  useEffect(() => {
    if (ponderations) {
      setWeights({
        w1: ponderations.w1, w2: ponderations.w2,
        w3: ponderations.w3, w4: ponderations.w4,
      });
    }
  }, [ponderations]);

  const sumValid = Math.abs(weights.w1 + weights.w2 + weights.w3 + weights.w4 - 1) <= 0.001;
  const canLaunch = selectedSessionId !== null && selectedProgrammeIds.size > 0 && sumValid;

  function toggleProgramme(id: number) {
    setSelectedProgrammeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleLaunch() {
    if (!selectedSessionId || !canLaunch) return;
    setError(null);
    setIsSaving(true);
    try {
      // 1. Sauvegarder les pondérations
      await sessionsApi.updatePonderations(selectedSessionId, weights);
      // 2. Lancer la génération
      const { affectationsApi: api } = await import("@/lib/api/affectations");
      const res = await api.generer(selectedSessionId, Array.from(selectedProgrammeIds));
      onTaskStarted(res.task_id, selectedSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du lancement");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-fg">Générer les affectations</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Sélectionnez la session, les programmes et ajustez les pondérations avant de lancer.
        </p>
      </div>

      {/* Session */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg">Session académique</label>
        <Select
          value={selectedSessionId?.toString() ?? ""}
          onValueChange={(v) => setSelectedSessionId(Number(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir une session…" />
          </SelectTrigger>
          <SelectContent>
            {(sessions ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Programmes */}
      {selectedSessionId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-fg">Programmes</label>
          <div className="flex flex-wrap gap-2">
            {(programmes ?? []).map((p) => {
              const selected = selectedProgrammeIds.has(p.id);
              return (
                <Button
                  key={p.id}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleProgramme(p.id)}
                >
                  {p.code} — {p.nom}
                </Button>
              );
            })}
          </div>
          {selectedProgrammeIds.size === 0 && (
            <p className="text-xs text-fg-muted">Sélectionnez au moins un programme.</p>
          )}
        </div>
      )}

      {/* Sliders W1-W4 */}
      {selectedSessionId && (
        <WeightSliders
          value={weights}
          onChange={setWeights}
          disabled={isSaving}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleLaunch}
        disabled={!canLaunch || isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" /> Lancer la génération</>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd frontend && npm run type-check
```

Expected : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add frontend/lib/hooks/useGenerationPoller.ts frontend/components/affectation/GenerationForm.tsx
git commit -m "feat(frontend): add GenerationForm with session/programme/weights and SWR poller hook"
```

---

## Task 7 : Page `/dashboard/rh/affectations`

**Files:**
- Create: `frontend/app/dashboard/rh/affectations/page.tsx`

- [ ] **Step 1 : Créer la page avec state machine**

Create `frontend/app/dashboard/rh/affectations/page.tsx` :

```typescript
"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { GenerationForm } from "@/components/affectation/GenerationForm";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import { useGenerationPoller } from "@/lib/hooks/useGenerationPoller";
import { affectationsApi, sessionsApi, programmesApi } from "@/lib/api/affectations";
import type { AffectationOut, Programme, Session, PonderationsOut } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";

type Phase = "configure" | "generating" | "review" | "error";

export default function AffectationsPage() {
  const [phase, setPhase] = useState<Phase>("configure");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Polling génération
  const { data: genStatus } = useGenerationPoller(
    phase === "generating" ? taskId : null
  );

  // Transition generating → review
  if (phase === "generating" && genStatus) {
    if (genStatus.status === "done") {
      setPhase("review");
    } else if (genStatus.status === "error") {
      setErrorMsg(genStatus.detail ?? "Erreur de génération");
      setPhase("error");
    }
  }

  // Charger les affectations en phase review
  const { data: affectations, mutate: mutateAffectations } = useSWR<AffectationOut[]>(
    phase === "review" && sessionId ? `/api/affectations/?session_id=${sessionId}` : null,
    phase === "review" && sessionId ? () => affectationsApi.list(sessionId) : null
  );

  // Charger les données de contexte (noms de cours / profs)
  const { data: sessions } = useSWR<Session[]>("/api/sessions/", sessionsApi.list);
  const { data: ponderations } = useSWR<PonderationsOut>(
    sessionId ? `/api/sessions/${sessionId}/ponderations` : null,
    sessionId ? () => sessionsApi.getPonderations(sessionId) : null
  );

  const poids = ponderations
    ? { w1: ponderations.w1, w2: ponderations.w2, w3: ponderations.w3, w4: ponderations.w4 }
    : { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

  // Résolution noms cours/profs (simplifiée — IDs uniquement en MVP)
  // Un vrai CRUD cours/profs ajouterait un endpoint /api/cours/ et /api/users/
  const coursNames: Record<number, string> = {};
  const professorNames: Record<number, string> = {};

  const handleTaskStarted = useCallback((tid: string, sid: number) => {
    setTaskId(tid);
    setSessionId(sid);
    setPhase("generating");
  }, []);

  const handleValidate = useCallback(async (id: number) => {
    await affectationsApi.validate(id, "validee");
    mutateAffectations();
  }, [mutateAffectations]);

  const handleReject = useCallback(async (id: number) => {
    await affectationsApi.validate(id, "rejetee");
    mutateAffectations();
  }, [mutateAffectations]);

  const reset = () => {
    setPhase("configure");
    setTaskId(null);
    setSessionId(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Affectations</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {phase === "configure" && "Configurez et lancez la génération automatique."}
            {phase === "generating" && "Génération en cours…"}
            {phase === "review" && "Révisez et validez les propositions."}
            {phase === "error" && "Une erreur est survenue."}
          </p>
        </div>
        {(phase === "review" || phase === "error") && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Nouvelle génération
          </Button>
        )}
      </div>

      {/* Phase configure */}
      {phase === "configure" && (
        <GenerationForm onTaskStarted={handleTaskStarted} />
      )}

      {/* Phase generating */}
      {phase === "generating" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-fg-muted">
            Calcul des scores W1–W4 en cours…
          </p>
          <p className="text-xs text-fg-muted">
            Statut : {genStatus?.status ?? "en attente"}
          </p>
        </div>
      )}

      {/* Phase review */}
      {phase === "review" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {affectations?.length ?? 0} propositions générées
            </span>
          </div>
          <AffectationTable
            affectations={affectations ?? []}
            coursNames={coursNames}
            professorNames={professorNames}
            poids={poids}
            onValidate={handleValidate}
            onReject={handleReject}
          />
        </div>
      )}

      {/* Phase error */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium text-fg">Erreur lors de la génération</p>
          <p className="text-sm text-fg-muted">{errorMsg}</p>
          <Button onClick={reset} variant="outline">Réessayer</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd frontend && npm run type-check
```

Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/app/dashboard/rh/affectations/page.tsx
git commit -m "feat(frontend): add RH affectations page with configure/generating/review state machine"
```

---

## Task 8 : Page `/dashboard/rh/historique` (Maquette 6)

**Files:**
- Create: `frontend/app/dashboard/rh/historique/page.tsx`

- [ ] **Step 1 : Créer la page historique**

Create `frontend/app/dashboard/rh/historique/page.tsx` :

```typescript
"use client";

import { useState } from "react";
import useSWR from "swr";
import { sessionsApi, affectationsApi } from "@/lib/api/affectations";
import { AffectationTable } from "@/components/affectation/AffectationTable";
import type { AffectationOut, PonderationsOut, Session } from "@/lib/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const STATUT_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  planifiee: "outline",
  ouverte: "default",
  fermee: "secondary",
};

export default function HistoriquePage() {
  const { data: sessions, isLoading } = useSWR<Session[]>(
    "/api/sessions/", sessionsApi.list
  );

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const { data: affectations } = useSWR<AffectationOut[]>(
    selectedSession ? `/api/affectations/?session_id=${selectedSession.id}&statut=validee` : null,
    selectedSession ? () => affectationsApi.list(selectedSession.id, "validee") : null
  );

  const { data: ponderations } = useSWR<PonderationsOut>(
    selectedSession ? `/api/sessions/${selectedSession.id}/ponderations` : null,
    selectedSession ? () => sessionsApi.getPonderations(selectedSession.id) : null
  );

  const poids = ponderations
    ? { w1: ponderations.w1, w2: ponderations.w2, w3: ponderations.w3, w4: ponderations.w4 }
    : { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold text-fg">Historique des sessions</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Consultez les affectations validées par session académique.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-fg-muted">Chargement des sessions…</p>
      )}

      {/* Liste des sessions */}
      {!selectedSession && (
        <div className="space-y-2">
          {(sessions ?? []).length === 0 && !isLoading && (
            <p className="text-sm text-fg-muted">Aucune session disponible.</p>
          )}
          {(sessions ?? []).map((sess) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSession(sess)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-canvas-pure px-4 py-3 text-left hover:bg-canvas transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-fg">{sess.nom}</span>
                <Badge variant={STATUT_BADGE[sess.statut] ?? "outline"}>
                  {sess.statut}
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-fg-muted" />
            </button>
          ))}
        </div>
      )}

      {/* Détail d'une session */}
      {selectedSession && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
              ← Sessions
            </Button>
            <h2 className="text-lg font-semibold text-fg">{selectedSession.nom}</h2>
            <Badge variant={STATUT_BADGE[selectedSession.statut] ?? "outline"}>
              {selectedSession.statut}
            </Badge>
          </div>

          <p className="text-sm text-fg-muted">
            {affectations?.length ?? 0} affectations validées
          </p>

          <AffectationTable
            affectations={affectations ?? []}
            coursNames={{}}
            professorNames={{}}
            poids={poids}
            onValidate={() => {}}
            onReject={() => {}}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd frontend && npm run type-check
```

Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/app/dashboard/rh/historique/page.tsx
git commit -m "feat(frontend): add RH historique page with session list and validated affectations"
```

---

## Task 9 : Nav + validation finale

**Files:**
- Modify: `frontend/lib/nav/rhNav.ts`

- [ ] **Step 1 : Activer les liens nav**

Modify `frontend/lib/nav/rhNav.ts` — retirer `disabled: true` sur les 2 routes :

```typescript
import { Home, Sparkles, ListChecks, Users } from "lucide-react";
import type { NavSection } from "./types";

export const rhNav: NavSection[] = [
  {
    label: "Ressources humaines",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: Home },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: Sparkles },
      { href: "/dashboard/rh/historique", label: "Historique", icon: ListChecks },
      { href: "/dashboard/rh/cv", label: "CV des profs", icon: Users, disabled: true },
    ],
  },
];
```

- [ ] **Step 2 : Lancer tous les tests frontend**

```bash
cd frontend && npm test
```

Expected : tous les tests PASS (WeightSliders ×5, ScoreBreakdown ×5, AffectationCard ×6, AffectationTable ×3 + tests existants).

- [ ] **Step 3 : Lint + type-check**

```bash
cd frontend && npm run lint && npm run type-check
```

Expected : 0 erreur, 0 warning.

- [ ] **Step 4 : Commit nav**

```bash
git add frontend/lib/nav/rhNav.ts
git commit -m "feat(frontend): enable affectations and historique nav links for RH"
```

- [ ] **Step 5 : Push + PR**

```bash
cd C:/workflow/defis-cite/profmatch
git push -u origin feature/rh-affectations
gh pr create \
  --title "feat(frontend): RH dashboard Maquettes 4/5/6 — génération affectations + XAI + historique" \
  --base feature/affectation-db \
  --body "..."
```

> **Note :** PR contre `feature/affectation-db` (pas `main`) car elle dépend de l'API PR #13. Rebaser contre `main` après merge de #13.

---

## Résumé attendu

| Métrique | Cible |
|---|---|
| Composants créés | 5 (`WeightSliders`, `ScoreBreakdown`, `AffectationCard`, `AffectationTable`, `GenerationForm`) |
| Pages créées | 2 (`/rh/affectations`, `/rh/historique`) |
| Tests unitaires | 19 cas (5+5+6+3) |
| TypeScript strict | 0 erreur |
| Lint | 0 erreur |
| Commits | 9 |
