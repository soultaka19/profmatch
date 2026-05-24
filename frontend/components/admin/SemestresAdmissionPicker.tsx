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
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-bg text-fg-muted hover:bg-bg-muted") +
              (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
            }
          >
            <span
              className={
                "flex h-4 w-4 items-center justify-center rounded-sm border " +
                (checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border")
              }
              aria-hidden="true"
            >
              {checked && (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-3 w-3"
                >
                  <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {SEMESTRE_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
