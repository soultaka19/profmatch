"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cvApi } from "@/lib/api/cv";
import { cn } from "@/lib/utils";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const MAX_SIZE = 10 * 1024 * 1024;

interface CVDropzoneProps {
  onUploaded?: () => void;
  disabled?: boolean;
  /**
   * "default" — pleine zone visible.
   * "compact" — barre fine "Remplacer le CV".
   * "hidden" — headless : aucun rendu visible, déclenchable via ref.open() uniquement.
   */
  variant?: "default" | "compact" | "hidden";
}

export interface CVDropzoneHandle {
  open: () => void;
}

export const CVDropzone = forwardRef<CVDropzoneHandle, CVDropzoneProps>(function CVDropzone(
  { onUploaded, disabled, variant = "default" },
  ref
) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      const file = accepted[0];
      setIsUploading(true);
      try {
        await cvApi.upload(file);
        toast.success(`CV « ${file.name} » téléversé.`);
        onUploaded?.();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Échec du téléversement";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections, open } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled: disabled || isUploading,
    noClick: false,
  });

  const openRef = useRef(open);
  openRef.current = open;
  useImperativeHandle(ref, () => ({ open: () => openRef.current() }), []);

  if (variant === "hidden") {
    return <input {...getInputProps()} className="sr-only" tabIndex={-1} aria-hidden="true" />;
  }

  if (variant === "compact") {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "mt-6 cursor-pointer rounded-md border border-dashed border-border bg-surface-subtle px-5 py-5 transition-colors",
          isDragActive && "border-primary bg-primary-soft",
          (disabled || isUploading) && "cursor-not-allowed opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border bg-canvas-pure text-fg-muted">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-fg">Remplacer le CV</div>
            <div className="mt-0.5 text-xs text-fg-subtle">
              {isUploading
                ? "Téléversement en cours…"
                : "Glissez un nouveau fichier ici ou cliquez pour parcourir. PDF ou DOCX · 10 Mo maximum."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "mt-6 cursor-pointer rounded-lg border-[1.5px] border-dashed border-border bg-surface-hover px-6 py-12 text-center transition-colors",
        isDragActive && "border-primary bg-primary-soft",
        (disabled || isUploading) && "cursor-not-allowed opacity-60"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-canvas-pure text-fg-muted">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>
        <div className="text-base font-medium text-fg">
          {isUploading
            ? "Téléversement en cours…"
            : isDragActive
              ? "Déposez votre fichier"
              : "Glissez votre CV ici"}
        </div>
        <div className="text-sm text-fg-subtle">PDF ou DOCX · 10 Mo maximum</div>
        {!isUploading && (
          <button
            type="button"
            className="mt-2 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-active transition-colors hover:bg-primary-dark"
          >
            Choisir un fichier
          </button>
        )}
        {fileRejections.length > 0 && (
          <div className="mt-2 text-sm text-destructive">{fileRejections[0].errors[0].message}</div>
        )}
      </div>
    </div>
  );
});
