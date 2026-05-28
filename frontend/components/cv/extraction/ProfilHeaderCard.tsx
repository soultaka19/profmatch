"use client";

import { Mail } from "lucide-react";

export function computeInitials(nomComplet: string | undefined): string {
  const cleaned = (nomComplet ?? "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    const c = parts[0].charAt(0).toUpperCase();
    return `${c}${c}`;
  }
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}

interface Props {
  nomComplet: string;
  email: string;
}

export function ProfilHeaderCard({ nomComplet, email }: Props) {
  const initials = computeInitials(nomComplet);

  return (
    <section className="mt-2 flex items-center gap-5 rounded-md border border-border bg-canvas-pure px-7 py-6 shadow-soft">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold tracking-wide text-primary-foreground"
      >
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-title font-semibold text-fg">
          {nomComplet || "—"}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <Mail className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          <span className="truncate">{email}</span>
        </div>
      </div>
    </section>
  );
}
