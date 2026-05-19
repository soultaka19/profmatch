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
}

export function CVDropzone({ onUploaded, disabled }: CVDropzoneProps) {
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
        const message =
          err instanceof Error ? err.message : "Échec du téléversement";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED,
      maxSize: MAX_SIZE,
      maxFiles: 1,
      disabled: disabled || isUploading,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30",
        (disabled || isUploading) && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <Upload className="h-8 w-8" />
        )}
        <div>
          {isUploading
            ? "Téléversement en cours…"
            : isDragActive
              ? "Déposez le fichier ici"
              : "Glissez-déposez votre CV (PDF ou DOCX, ≤10 Mo) ou cliquez"}
        </div>
        {fileRejections.length > 0 && (
          <div className="text-sm text-destructive">
            {fileRejections[0].errors[0].message}
          </div>
        )}
      </div>
    </div>
  );
}
