import Link from "next/link";
import type { ReactNode } from "react";
import { UserCog, BookOpen, Calendar, GraduationCap, ClipboardCheck } from "lucide-react";
import type { AdminStatsOut } from "@/lib/types/api";

interface CardDef {
  title: string;
  value: number;
  hint?: string;
  href: string;
  icon: ReactNode;
}

export function AdminStatsCards({
  stats,
  isLoading,
  error,
}: {
  stats: AdminStatsOut | undefined;
  isLoading: boolean;
  error?: boolean;
}) {
  if (error && !isLoading && !stats) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-canvas-pure px-4 py-6 text-center text-sm text-destructive"
      >
        Impossible de charger les statistiques pour le moment. Réessayez plus tard.
      </div>
    );
  }
  if (isLoading || !stats) {
    return (
      <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-canvas-pure" />
        ))}
        <span className="sr-only">Chargement des statistiques…</span>
      </div>
    );
  }

  const cards: CardDef[] = [
    { title: "Utilisateurs", value: stats.utilisateurs_total, hint: `${stats.professeurs_total} professeurs`, href: "/dashboard/admin/utilisateurs", icon: <UserCog className="h-5 w-5 text-primary" /> },
    { title: "CV traités", value: stats.cv_traites, hint: `${stats.cv_en_attente} en attente`, href: "/dashboard/rh/professeurs", icon: <ClipboardCheck className="h-5 w-5 text-primary" /> },
    { title: "Cours", value: stats.cours_total, href: "/dashboard/admin/cours", icon: <BookOpen className="h-5 w-5 text-primary" /> },
    { title: "Programmes", value: stats.programmes_total, href: "/dashboard/admin/programmes", icon: <GraduationCap className="h-5 w-5 text-primary" /> },
    { title: "Sessions", value: stats.sessions_total, hint: `${stats.sessions_ouvertes} ouverte(s)`, href: "/dashboard/admin/sessions", icon: <Calendar className="h-5 w-5 text-primary" /> },
    { title: "Affectations validées", value: stats.affectations_validees, hint: `${stats.affectations_total} au total`, href: "/dashboard/rh/affectations", icon: <ClipboardCheck className="h-5 w-5 text-primary" /> },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          className="rounded-lg border border-border bg-canvas-pure p-5 transition hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fg-muted">{c.title}</span>
            {c.icon}
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-fg">{c.value}</p>
          {c.hint && <p className="mt-1 text-xs text-fg-muted">{c.hint}</p>}
        </Link>
      ))}
    </div>
  );
}
