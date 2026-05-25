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

const WEIGHT_META: {
  key: keyof Weights;
  label: string;
  description: string;
}[] = [
  { key: "w1", label: "W1", description: "Compétences" },
  { key: "w2", label: "W2", description: "Expérience" },
  { key: "w3", label: "W3", description: "Historique" },
  { key: "w4", label: "W4", description: "Sémantique" },
];

export function WeightSliders({
  value,
  onChange,
  disabled = false,
}: WeightSlidersProps) {
  // Coercion défensive : l'API peut retourner des strings Decimal
  const sum = Number(value.w1) + Number(value.w2) + Number(value.w3) + Number(value.w4);
  const isValid = Math.abs(sum - 1) <= 0.001;

  function handleChange(key: keyof Weights, newVal: number) {
    onChange({ ...value, [key]: Math.round(newVal * 1000) / 1000 });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">Pondérations W1–W4</span>
        <Badge variant={isValid ? "default" : "destructive"}>
          {sum.toFixed(3)}
        </Badge>
      </div>
      <p className="text-xs text-fg-muted">
        La somme des pondérations doit rester exactement à 1.000 pour lancer la génération.
      </p>
      {!isValid && (
        <p className="text-xs text-destructive">
          La somme doit être égale à 1.000 (± 0.001)
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {WEIGHT_META.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-fg">
                {label} — {description}
              </span>
              <span className="tabular-nums text-fg-muted">
                {(Number(value[key]) * 100).toFixed(0)}%
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
