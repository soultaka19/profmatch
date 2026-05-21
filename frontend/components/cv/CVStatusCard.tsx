"use client";

import { CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { ProgressCard } from "./ProgressCard";
import type { CVResponse } from "@/lib/types/api";

interface Props {
  data: CVResponse | null | undefined;
  loading: boolean;
  onRetry?: () => void;
  onReplace?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileTypeLabel(mime: string): string {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("officedocument")) return "DOCX";
  return mime;
}

/** Affiche un nom de fichier de manière propre — tronque les hash longs. */
function prettyFileName(name: string): string {
  // Si le nom ressemble à un hash (32+ chars hex avant l'extension), tronquer.
  const m = name.match(/^([0-9a-f]{16,})(\.\w+)$/i);
  if (m) return `${m[1].slice(0, 8)}…${m[2]}`;
  return name;
}

export function CVStatusCard({ data, loading, onRetry, onReplace }: Props) {
  if (!data) return null;

  const meta = `Téléversé le ${formatDate(data.televerse_le)} · ${formatBytes(data.taille_octets)} · ${fileTypeLabel(data.mime_type)}`;

  if (data.statut === "en_attente" || data.statut === "en_cours") {
    return (
      <ProgressCard
        fileName={data.nom_original}
        fileMeta={meta}
        activeStep={data.statut === "en_attente" ? "upload" : "extraction"}
      />
    );
  }

  if (data.statut === "erreur") {
    return (
      <div className="mt-6 rounded-md border border-border bg-canvas-pure px-5 py-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-destructive-bg text-destructive">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="truncate text-[15px] font-semibold text-fg">{data.nom_original}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                Erreur
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-subtle">{meta}</p>
            {data.message_erreur && (
              <p className="mt-3 text-sm leading-relaxed text-destructive">{data.message_erreur}</p>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-destructive bg-canvas-pure px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Réessayer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // traite
  return (
    <div className="mt-6 flex items-center gap-5 rounded-md border border-border bg-canvas-pure px-6 py-4 shadow-soft">
      <div
        aria-hidden="true"
        className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
      >
        <FileText className="h-5 w-5" strokeWidth={1.75} />
        <span className="absolute -bottom-1 right-0 rounded bg-primary px-1 text-[8px] font-bold tracking-wide text-primary-foreground">
          {fileTypeLabel(data.mime_type)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3
            className="truncate text-[15px] font-medium text-fg"
            title={data.nom_original}
          >
            {prettyFileName(data.nom_original)}
          </h3>
          <span
            className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-success"
            aria-label="Analysé"
          >
            <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
            Analysé
          </span>
        </div>
        <p className="mt-0.5 text-xs text-fg-subtle">{meta}</p>
      </div>
      {onReplace && (
        <button
          type="button"
          onClick={onReplace}
          className="flex-shrink-0 rounded-md border border-border bg-canvas-pure px-3.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary"
        >
          Remplacer
        </button>
      )}
    </div>
  );
}
