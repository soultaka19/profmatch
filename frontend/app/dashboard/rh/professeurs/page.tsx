"use client";

import { useEffect, useState } from "react";
import { ProfesseursTable } from "@/components/rh/professeurs/ProfesseursTable";
import { ProfesseurCvDrawer } from "@/components/rh/professeurs/ProfesseurCvDrawer";
import {
  AdminTableEmpty, AdminTableLoading, AdminTableToolbar,
  TableSearch, TablePagination,
} from "@/components/admin/AdminDataTable";
import {
  useRhProfesseurs,
  RH_PROFESSEURS_PAGE_SIZE,
} from "@/lib/hooks/useRhProfesseurs";

export default function Page() {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(RH_PROFESSEURS_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useRhProfesseurs(page, debouncedQ, pageSize);

  const total = data?.total ?? 0;
  const effectivePageSize = data?.page_size ?? pageSize;
  const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
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

      <AdminTableToolbar countLabel={`${total} professeur${total > 1 ? "s" : ""}`}>
        <TableSearch
          label="Rechercher un professeur"
          placeholder="Rechercher par nom ou courriel…"
          value={search}
          onChange={setSearch}
        />
      </AdminTableToolbar>

      {error ? (
        <AdminTableEmpty
          title="Erreur de chargement"
          description="Impossible de charger les professeurs. Rechargez la page."
        />
      ) : isLoading ? (
        <AdminTableLoading />
      ) : items.length === 0 ? (
        <AdminTableEmpty
          title="Aucun professeur"
          description={debouncedQ ? "Modifiez votre recherche." : "Aucun profil ne correspond pour le moment."}
        />
      ) : (
        <>
          <ProfesseursTable items={items} onPreview={handlePreview} />
          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={effectivePageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
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
