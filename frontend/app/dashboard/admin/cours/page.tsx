"use client";

import { useState } from "react";
import useSWR from "swr";
import { coursApi } from "@/lib/api/cours";
import type { CoursReadOnly } from "@/lib/types/programmes";
import type { Cours } from "@/lib/types/cours";
import { CoursTable } from "@/components/admin/CoursTable";
import { CoursCreateDialog } from "@/components/admin/CoursCreateDialog";
import { CoursEditDialog } from "@/components/admin/CoursEditDialog";
import { CoursDeleteDialog } from "@/components/admin/CoursDeleteDialog";
import { Input } from "@/components/ui/input";

export default function Page() {
  const [search, setSearch] = useState("");
  const swrKey = `cours:list:${search}`;
  const { data: cours, mutate, isLoading } = useSWR<CoursReadOnly[]>(
    swrKey,
    () => coursApi.list(search || undefined)
  );
  const [editing, setEditing] = useState<Cours | null>(null);
  const [deleting, setDeleting] = useState<CoursReadOnly | null>(null);

  async function openEdit(c: CoursReadOnly) {
    const full = await coursApi.get(c.id);
    setEditing(full);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Cours</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Référentiel des cours académiques. Les cours peuvent être rattachés aux étapes
            d&apos;un programme depuis la page Programmes.
          </p>
        </div>
        <CoursCreateDialog onCreated={() => mutate()} />
      </div>

      <div className="max-w-md">
        <Input
          type="search"
          placeholder="Rechercher par code ou nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>
      ) : (
        <CoursTable
          cours={cours ?? []}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      <CoursEditDialog
        cours={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => mutate()}
      />
      <CoursDeleteDialog
        cours={deleting}
        onClose={() => setDeleting(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
