"use client";

import {
  SEMESTRES_ADMISSION,
  SEMESTRE_LABEL,
  type SemestreAdmission,
} from "@/lib/types/programmes";

interface Props {
  value: SemestreAdmission[];
  onChange: (next: SemestreAdmission[]) => void;
  disabled?: boolean;
}

const ACTIVE_CLASSES: Record<SemestreAdmission, string> = {
  automne:
    "border-orange-400 bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-700",
  hiver:
    "border-sky-400 bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-700",
  printemps:
    "border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700",
};

const ICON: Record<SemestreAdmission, string> = {
  automne: "🍂",
  hiver: "❄️",
  printemps: "🌱",
};

export function SemestresAdmissionPicker({ value, onChange, disabled }: Props) {
  function toggle(s: SemestreAdmission) {
    if (disabled) return;
    if (value.includes(s)) {
      onChange(value.filter((v) => v !== s));
    } else {
      onChange([...value, s]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {SEMESTRES_ADMISSION.map((s) => {
        const checked = value.includes(s);
        return (
          <button
            type="button"
            key={s}
            onClick={() => toggle(s)}
            disabled={disabled}
            aria-pressed={checked}
            className={
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors " +
              (checked
                ? ACTIVE_CLASSES[s]
                : "border-border bg-canvas-pure text-fg-muted hover:bg-surface") +
              (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
            }
          >
            <span aria-hidden="true">{ICON[s]}</span>
            {SEMESTRE_LABEL[s]}
            {checked && (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path
                  d="M3 8l3 3 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
