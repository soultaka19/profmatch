"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProfesseursTable } from "@/components/rh/professeurs/ProfesseursTable";
import { ProfesseurCvDrawer } from "@/components/rh/professeurs/ProfesseurCvDrawer";
import {
  useRhProfesseurs,
  RH_PROFESSEURS_PAGE_SIZE,
} from "@/lib/hooks/useRhProfesseurs";

export default function Page() {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useRhProfesseurs(page, debouncedQ);

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? RH_PROFESSEURS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = data?.items ?? [];

  const handlePreview = (professeurId: number) => {
    setSelectedId(professeurId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-semibold text-fg">Professeurs</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Consultez les profils extraits des CV. Lecture seule — aucune modification possible.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom ou courriel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un professeur"
        />
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-destructive">
          Impossible de charger les professeurs. Rechargez la page.
        </p>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-fg-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">
          Aucun professeur ne correspond à votre recherche.
        </p>
      ) : (
        <>
          <ProfesseursTable items={items} onPreview={handlePreview} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-subtle tabular-nums">
              {total} professeur{total > 1 ? "s" : ""} · page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      <ProfesseurCvDrawer
        professeurId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
