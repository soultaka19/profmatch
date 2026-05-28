"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends Required<ConfirmOptions> {
  open: boolean;
}

const DEFAULTS: Required<ConfirmOptions> = {
  title: "Confirmer",
  description: "Êtes-vous sûr de vouloir continuer ?",
  confirmLabel: "Confirmer",
  cancelLabel: "Annuler",
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({ ...DEFAULTS, open: false });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({ ...DEFAULTS, ...options, open: true });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setDialog((d) => ({ ...d, open: false }));
  }

  function handleCancel() {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialog((d) => ({ ...d, open: false }));
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={dialog.open} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>{dialog.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{dialog.confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm doit être appelé dans un ConfirmProvider");
  return ctx;
}
