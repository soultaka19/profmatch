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
    <div className="mt-4 max-w-[680px] overflow-hidden rounded-lg border border-border bg-canvas">
      <Accordion type="single" collapsible>
        <AccordionItem value="texte" className="border-none">
          <AccordionTrigger
            onClick={fetchText}
            className="flex items-center gap-2.5 border-b border-border-soft px-6 py-4 text-sm font-medium text-fg hover:no-underline"
          >
            <FileText className="h-4 w-4 text-fg-subtle" />
            <span className="flex-1 text-left">Texte extrait par l&apos;IA</span>
          </AccordionTrigger>
          <AccordionContent className="bg-surface p-6 text-sm leading-relaxed text-fg-muted">
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
