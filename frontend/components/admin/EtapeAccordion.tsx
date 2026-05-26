"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2 } from "lucide-react";
import type { Etape } from "@/lib/types/programmes";
import { CursusList } from "./CursusList";

interface Props {
  programmeId: number;
  etapes: Etape[];
  onDeleteEtape: (e: Etape) => void;
  onCursusChanged: () => void;
}

export function EtapeAccordion({
  programmeId,
  etapes,
  onDeleteEtape,
  onCursusChanged,
}: Props) {
  if (etapes.length === 0) {
    return (
      <p className="text-sm text-fg-muted py-8 text-center border border-dashed border-border rounded-md">
        Aucune étape. Ajoutez la première étape pour commencer à rattacher des cours.
      </p>
    );
  }
  return (
    <Accordion type="multiple" className="space-y-2">
      {etapes.map((e) => (
        <AccordionItem
          key={e.id}
          value={`etape-${e.id}`}
          className="rounded-lg border border-border bg-canvas-pure px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full items-center justify-between pr-4">
              <span className="font-medium">
                Étape {e.ordre}
                {e.nom ? ` — ${e.nom}` : ""}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-2">
              <CursusList
                programmeId={programmeId}
                etapeId={e.id}
                onChanged={onCursusChanged}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteEtape(e)}
                  title="Supprimer cette étape"
                >
                  <Trash2 className="h-4 w-4 text-destructive mr-1" />
                  Supprimer l&apos;étape
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
