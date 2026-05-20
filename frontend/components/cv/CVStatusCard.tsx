"use client";

import { ProgressCard } from "./ProgressCard";
import type { CVResponse } from "@/lib/types/api";

interface Props {
  data: CVResponse | null | undefined;
  loading: boolean;
  onRetry?: () => void;
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

export function CVStatusCard({ data, loading, onRetry }: Props) {
  if (!data) return null;

  const meta = `${formatBytes(data.taille_octets)} · ${fileTypeLabel(data.mime_type)}`;

  if (data.statut === "en_attente" || data.statut === "en_cours") {
    return (
      <ProgressCard
        fileName={data.nom_original}
        fileMeta={`Téléversé le ${formatDate(data.televerse_le)} · ${meta}`}
        activeStep={data.statut === "en_attente" ? "upload" : "extraction"}
      />
    );
  }

  if (data.statut === "erreur") {
    return (
      <div className="mt-6 max-w-[680px] rounded-lg border border-border bg-canvas px-6 py-5 shadow-soft">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3.5 py-1.5 text-xs font-semibold text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Erreur d&apos;extraction
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fg">{data.nom_original}</div>
            <div className="mt-0.5 text-xs text-fg-subtle">{meta}</div>
          </div>
        </div>
        {data.message_erreur && (
          <p className="mt-3 text-sm leading-relaxed text-destructive">{data.message_erreur}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-destructive bg-canvas px-3.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            ↻ Réessayer
          </button>
        )}
      </div>
    );
  }

  // traite
  return (
    <div className="mt-6 max-w-[680px] rounded-lg border border-border bg-canvas px-6 py-5 shadow-soft">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3.5 py-1.5 text-xs font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          CV traité
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-fg">{data.nom_original}</div>
          <div className="mt-0.5 text-xs text-fg-subtle">
            Téléversé le {formatDate(data.televerse_le)} · {meta}
          </div>
        </div>
      </div>
    </div>
  );
}
