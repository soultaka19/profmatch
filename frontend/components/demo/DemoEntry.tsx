"use client";

import { AlertCircle, Hourglass, Loader2, LogIn, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useDemo } from "@/components/demo/DemoProvider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

const POINTS = [
  {
    titre: "Aucune inscription",
    detail: "Ni adresse courriel, ni mot de passe. Un clic, et vous êtes dedans.",
  },
  {
    titre: "Les trois rôles, sans se reconnecter",
    detail:
      "Professeur, RH et administration : le scénario complet, du CV téléversé à l'affectation justifiée.",
  },
  {
    titre: "Votre propre session académique",
    detail:
      "Vous générez et validez des affectations dans votre espace ; les données de l'établissement restent en lecture.",
  },
  {
    titre: "Effacé au bout d'une heure",
    detail:
      "Vos comptes, votre session et le CV que vous auriez téléversé sont supprimés automatiquement.",
  },
];

export function DemoEntry() {
  const { demarrer } = useDemo();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [patienter, setPatienter] = useState(false);

  const lancer = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      await demarrer();
    } catch (e) {
      setEnCours(false);
      // Un plafond atteint ou une limite de créations n'est pas une panne :
      // c'est « revenez dans une minute », et le message le dit déjà.
      const api = e instanceof ApiError ? e : null;
      setPatienter(api?.status === 429 || api?.status === 503);
      setErreur(
        api?.message ??
          "L'espace de démonstration n'a pas pu être créé. Réessayez dans un instant."
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-primary-dark px-6 py-14">
      <section className="w-full max-w-[560px] rounded-2xl bg-canvas-pure p-10 shadow-lift">
        <p className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary">
          ProfMatch
        </p>
        <h1 className="mt-3 text-display-lg font-bold text-fg">
          Essayez, sans créer de compte.
        </h1>
        <p className="mt-3 text-body-lg text-fg-muted">
          Un espace de démonstration rien qu&apos;à vous : le référentiel de
          l&apos;établissement est déjà chargé, vous n&apos;avez qu&apos;à
          l&apos;utiliser.
        </p>

        <ul className="mt-8 flex flex-col gap-5">
          {POINTS.map((point) => (
            <li key={point.titre} className="flex flex-col gap-1">
              <span className="text-body-sm font-semibold text-fg">{point.titre}</span>
              <span className="text-body-sm text-fg-muted">{point.detail}</span>
            </li>
          ))}
        </ul>

        {erreur && (
          <div
            className={
              patienter
                ? "mt-8 flex items-start gap-2 rounded-md bg-primary-soft p-3 text-body-sm text-primary"
                : "mt-8 flex items-start gap-2 rounded-md bg-destructive-bg p-3 text-body-sm text-destructive"
            }
          >
            {patienter ? (
              <Hourglass className="mt-0.5 h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            )}
            <span>{erreur}</span>
          </div>
        )}

        <Button className="mt-8 w-full" size="lg" disabled={enCours} onClick={lancer}>
          {enCours ? (
            <>
              <Loader2 className="animate-spin" />
              Préparation de votre espace…
            </>
          ) : (
            <>
              <Play />
              {erreur ? "Réessayer" : "Entrer dans la démonstration"}
            </>
          )}
        </Button>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-body-sm text-fg-muted hover:text-primary"
        >
          <LogIn className="h-4 w-4" />
          J&apos;ai déjà un compte
        </Link>
      </section>
    </main>
  );
}
