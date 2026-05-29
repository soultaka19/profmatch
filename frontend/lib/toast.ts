import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

/** Toast de succès uniforme. */
export function toastSuccess(message: string): void {
  toast.success(message);
}

/**
 * Toast d'erreur : préfère le message lisible d'une ApiError/Error,
 * sinon le fallback fourni par l'appelant.
 */
export function toastError(err: unknown, fallback: string): void {
  const message =
    err instanceof ApiError || err instanceof Error ? err.message : fallback;
  toast.error(message || fallback);
}
