"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cvApi } from "@/lib/api/cv";

export function CVTextPreview() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchText = async () => {
    if (text || loading) return;
    setLoading(true);
    try {
      const data = await cvApi.texte();
      setText(data.texte_brut);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de charger le texte.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-canvas-pure">
      <Accordion type="single" collapsible>
        <AccordionItem value="texte" className="border-none">
          <AccordionTrigger
            onClick={fetchText}
            className="flex items-center gap-3 px-5 py-4 text-left hover:no-underline data-[state=open]:border-b data-[state=open]:border-border-soft"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-fg">Texte extrait par l&apos;IA</div>
              <div className="mt-0.5 text-xs text-fg-subtle">
                Compétences, expériences et formations détectées
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="bg-surface/60 p-5 text-sm leading-relaxed text-fg-muted">
            {loading && (
              <div className="flex items-center gap-2 text-fg-subtle">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…
              </div>
            )}
            {error && <div className="text-destructive">{error}</div>}
            {text && (
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {text}
              </pre>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
