"use client";

import { useState } from "react";
import { Database, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { maintenanceApi, type SeedDemoResult } from "@/lib/api/maintenance";

/**
 * Carte admin « Jeu de démonstration » — charge à la demande les données de
 * démo (comptes, programmes/cours/session, professeurs avec CV traité +
 * embeddings W4) via l'endpoint idempotent POST /api/admin/maintenance/seed-demo.
 *
 * Idempotent côté serveur : rejouer la commande ne crée pas de doublon, ce qui
 * permet de préparer une démonstration en un clic sans risque.
 */
export function SeedDemoCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedDemoResult | null>(null);

  async function handleSeed() {
    setLoading(true);
    try {
      const r = await maintenanceApi.seedDemo();
      setResult(r);
      toast.success(
        `Jeu de démonstration chargé — ${r.professeurs} professeurs, ${r.cours} cours.`,
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Échec du chargement du jeu de démonstration.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-soft ring-1 ring-primary/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-eyebrow font-semibold uppercase tracking-eyebrow text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            À préparer en premier
          </span>
          <h2 className="mt-2 flex items-center gap-2 text-title-sm font-semibold text-fg">
            <Database className="h-5 w-5 text-primary" aria-hidden />
            Jeu de démonstration
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Charge en un clic les comptes, programmes, cours, la session et ~11 professeurs
            avec CV traité (puis recalcule les embeddings W4). Idempotent : sans effet si les
            données existent déjà.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={loading} className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Chargement…
                </>
              ) : (
                "Charger le jeu de démo"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Charger le jeu de démonstration ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les comptes, le catalogue de cours, la session et environ 11 professeurs avec
                CV traité seront créés s&apos;ils n&apos;existent pas déjà. Opération sûre et
                rejouable (aucun doublon).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeed}>Charger</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {result && (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Utilisateurs" value={result.utilisateurs} />
          <Stat label="Professeurs" value={result.professeurs} />
          <Stat label="Cours" value={result.cours} />
          <Stat label="Sessions" value={result.sessions} />
          <Stat label="Embeddings profs" value={result.embeddings_professeurs} />
          <Stat label="Embeddings cours" value={result.embeddings_cours} />
        </dl>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border-soft bg-canvas px-3 py-2">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}
