"use client";

import type { ExtractionData } from "@/lib/api/extraction";

export function computeCompletionPercent(data: ExtractionData): number {
  const sections = [
    !!data.profil.resume && data.profil.resume.trim().length > 0,
    data.competences.length > 0,
    data.experiences.length > 0,
    data.formations.length > 0,
    data.langues.length > 0,
  ];
  const filled = sections.filter(Boolean).length;
  return Math.round((filled / sections.length) * 100);
}

interface Props {
  data: ExtractionData;
}

export function ProfilCompletion({ data }: Props) {
  const percent = computeCompletionPercent(data);

  return (
    <section className="mt-2 rounded-md border border-border bg-canvas-pure px-7 py-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-fg-muted">
          Votre profil est complet à{" "}
          <span className="font-semibold text-fg tabular-nums">{percent}%</span>
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          {percent === 100 ? "Complet" : "En cours"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression du profil"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-soft"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
