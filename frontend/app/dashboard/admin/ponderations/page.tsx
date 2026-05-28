"use client";

import Link from "next/link";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { PonderationsOut, Session } from "@/lib/types/api";
import { SessionStatutBadge } from "@/components/admin/SessionStatutBadge";
import { PonderationsBar } from "@/components/admin/PonderationsBar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Scale } from "lucide-react";
import { AdminTableEmpty, AdminTableLoading, AdminTableShell, AdminTableToolbar } from "@/components/admin/AdminDataTable";

interface SessionWithPond {
  session: Session;
  pond: PonderationsOut;
}

export default function Page() {
  const { data, isLoading } = useSWR<SessionWithPond[]>("ponderations:list", async () => {
    const sessions = await sessionsApi.list();
    const pairs = await Promise.all(
      sessions.map(async (s) => ({
        session: s,
        pond: await sessionsApi.getPonderations(s.id),
      })),
    );
    return pairs;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-semibold text-fg flex items-center gap-2">
          <Scale className="h-6 w-6" />
          Pondérations W1–W4
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Vue d&apos;ensemble des pondérations actuelles de chaque session. Éditez-les
          depuis le détail de la session.
        </p>
      </div>

      <AdminTableToolbar countLabel={`${data?.length ?? 0} session${data?.length === 1 ? "" : "s"}`} />

      {isLoading ? (
        <AdminTableLoading />
      ) : !data || data.length === 0 ? (
        <AdminTableEmpty title="Aucune session" description={<>
          Créez-en une dans{" "}
          <Link href="/dashboard/admin/sessions" className="text-primary underline">
            Sessions
          </Link>
          .
        </>} />
      ) : (
        <AdminTableShell>
          <table aria-label="Pondérations par session" className="min-w-[760px] w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Session</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Répartition W1–W4</th>
                <th className="px-4 py-2 text-left">XAI</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(({ session, pond }) => (
                <tr key={session.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-3 font-medium text-fg">{session.nom}</td>
                  <td className="px-4 py-3">
                    <SessionStatutBadge statut={session.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <PonderationsBar
                      w1={pond.w1}
                      w2={pond.w2}
                      w3={pond.w3}
                      w4={pond.w4}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {pond.xai_actif ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Actif</span>
                    ) : (
                      <span className="text-fg-muted">Fallback statique</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/admin/sessions/${session.id}`}>
                      <Button size="sm" variant="outline">
                        <span>Éditer</span>
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-border bg-surface-subtle px-4 py-2 text-xs text-fg-muted">
            <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500 mr-1" /> W1 Compétences
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500 mx-1 ml-3" /> W2 Expérience
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-500 mx-1 ml-3" /> W3 Historique
            <span className="inline-block h-2 w-2 rounded-sm bg-rose-500 mx-1 ml-3" /> W4 Sémantique
          </div>
        </AdminTableShell>
      )}
    </div>
  );
}
