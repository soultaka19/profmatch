"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfilDto } from "@/lib/api/extraction";
import { ProfilForm } from "./ProfilForm";

/**
 * Découpe un résumé en paragraphes : split sur double-newline si présent,
 * sinon split sur points pour produire 2-3 paragraphes équilibrés à partir
 * d'un bloc unique. Évite le mur de texte que renvoie souvent le LLM.
 */
function splitParagraphs(text: string): string[] {
  const trimmed = text.trim();
  // Cas 1 : l'utilisateur (ou le LLM) a déjà mis des sauts de ligne doubles.
  if (/\n\s*\n/.test(trimmed)) {
    return trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }
  // Cas 2 : un seul bloc. Si court (< 280 chars), un seul paragraphe.
  if (trimmed.length < 280) return [trimmed];
  // Cas 3 : un long bloc — couper en 2 sur le point le plus proche du milieu.
  const sentences = trimmed.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences || sentences.length < 2) return [trimmed];
  const mid = Math.floor(sentences.length / 2);
  return [sentences.slice(0, mid).join("").trim(), sentences.slice(mid).join("").trim()];
}

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
          <h3 className="text-eyebrow font-bold tracking-eyebrow text-fg">Profil</h3>
        </div>
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
      </header>

      <div className="px-7 py-7">
        {hasResume ? (
          <div className="max-w-[68ch] space-y-4">
            {splitParagraphs(profil.resume!).map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.75] text-fg-muted">
                {p}
              </p>
            ))}
          </div>
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
