"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfilDto } from "@/lib/api/extraction";
import { SourceBadge } from "./SourceBadge";
import { ProfilForm } from "./ProfilForm";

interface Props {
  profil: ProfilDto;
  onMutate: () => void;
}

export function ProfilSection({ profil, onMutate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const hasResume = !!profil.resume;

  return (
    <section className="group/section mt-8 rounded-md border border-border bg-canvas-pure shadow-soft transition-shadow hover:shadow-card">
      <header className="flex items-center justify-between border-b border-border-soft px-7 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">00</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">Profil</h3>
        </div>
        <div className="flex items-center gap-3">
          {hasResume && <SourceBadge source={profil.source} />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFormOpen(true)}
            className="opacity-0 transition-opacity group-hover/section:opacity-100 focus-visible:opacity-100 -mr-2"
            aria-label={hasResume ? "Modifier le profil" : "Ajouter un profil"}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {hasResume ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </header>

      <div className="px-7 py-6">
        {hasResume ? (
          <p className="font-display text-lg italic leading-relaxed text-fg max-w-[62ch]">
            {profil.resume}
          </p>
        ) : (
          <button
            onClick={() => setFormOpen(true)}
            className="block w-full text-left text-sm text-fg-subtle italic hover:text-fg-muted transition-colors"
          >
            Aucun résumé pour l&apos;instant — cliquez pour en ajouter un.
          </button>
        )}
      </div>

      <ProfilForm
        open={formOpen}
        initialResume={profil.resume ?? ""}
        onOpenChange={setFormOpen}
        onMutate={onMutate}
      />
    </section>
  );
}
