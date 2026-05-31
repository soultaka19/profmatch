import { RotateCcw } from "lucide-react";
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

interface NewGenerationButtonProps {
  hasPendingProposals: boolean;
  onReset: () => void;
}

export function NewGenerationButton({
  hasPendingProposals,
  onReset,
}: NewGenerationButtonProps) {
  const button = (
    <Button variant="outline" size="sm" onClick={hasPendingProposals ? undefined : onReset}>
      <RotateCcw className="mr-2 h-4 w-4" />
      Nouvelle génération
    </Button>
  );

  if (!hasPendingProposals) return button;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Commencer une nouvelle génération ?</AlertDialogTitle>
          <AlertDialogDescription>
            Des propositions restent à réviser. Une nouvelle génération quittera cette liste en
            cours.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel>Continuer la révision</AlertDialogCancel>
          <AlertDialogAction onClick={onReset}>Démarrer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
