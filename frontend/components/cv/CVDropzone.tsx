"use client";

import { useCallback, useState } from "react";
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
  variant?: "default" | "compact";
}

export function CVDropzone({ onUploaded, disabled, variant = "default" }: CVDropzoneProps) {
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

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  if (variant === "compact") {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "mt-4 max-w-[680px] cursor-pointer rounded-md border border-dashed border-[#c8b9a5] bg-surface px-5 py-4 text-center text-sm text-fg-subtle transition-colors",
          isDragActive && "border-primary bg-primary/[0.04]",
          (disabled || isUploading) && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Téléversement…
          </span>
        ) : (
          <>
            Remplacer le CV ?{" "}
            <strong className="text-primary">Glissez un nouveau fichier ici</strong> ou cliquez pour parcourir.
          </>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "mt-6 max-w-[680px] cursor-pointer rounded-lg border-[1.5px] border-dashed border-[#c8b9a5] bg-surface px-6 py-12 text-center transition-colors",
        isDragActive && "border-primary bg-primary/[0.04]",
        (disabled || isUploading) && "cursor-not-allowed opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-fg-subtle" />
        )}
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
            className="mt-2 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-active"
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
}
