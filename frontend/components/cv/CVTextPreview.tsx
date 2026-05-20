"use client";

import { useState } from "react";
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
      const message =
        err instanceof Error ? err.message : "Impossible de charger le texte.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="texte">
        <AccordionTrigger onClick={fetchText}>
          Voir le texte extrait de mon CV
        </AccordionTrigger>
        <AccordionContent>
          {loading && <div>Chargement…</div>}
          {error && <div className="text-destructive">{error}</div>}
          {text && (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
              {text}
            </pre>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
