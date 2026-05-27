"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowRight, ListChecks, Sparkles, Users } from "lucide-react";

export default function Page() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-semibold text-fg">
          Bienvenue, {user?.nom_complet ?? "Responsable"}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-fg-muted">
          Pilotez les propositions d&apos;affectation, révisez les justifications IA
          et retrouvez les validations par session académique.
        </p>
      </div>

      <div className="rounded-md border border-border bg-canvas-pure p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg">Flux RH recommandé</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Choisir une session, sélectionner les programmes, ajuster les
              pondérations W1-W4, générer les propositions puis valider les
              affectations à retenir.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/rh/affectations"
          className="group rounded-md border border-border bg-canvas-pure p-5 shadow-sm transition hover:border-primary-border hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-fg">Générer des affectations</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Lancez le scoring W1-W4 et révisez les propositions par cours.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
            Commencer <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/dashboard/rh/historique"
          className="group rounded-md border border-border bg-canvas-pure p-5 shadow-sm transition hover:border-primary-border hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <ListChecks className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-fg">Consulter l&apos;historique</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Retrouvez les affectations validées pour chaque session.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
            Voir les sessions <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/dashboard/rh/professeurs"
          className="group rounded-md border border-border bg-canvas-pure p-5 shadow-sm transition hover:border-primary-border hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Users className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-fg">Consulter les CV profs</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Parcourez les professeurs et leur profil de CV extrait.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
            Voir les professeurs <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
