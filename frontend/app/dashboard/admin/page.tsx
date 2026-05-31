"use client";

import useSWR from "swr";
import { Scale } from "lucide-react";
import { adminStatsApi } from "@/lib/api/adminStats";
import type { AdminStatsOut } from "@/lib/types/api";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { SeedDemoCard } from "@/components/admin/SeedDemoCard";

export default function Page() {
  const { data, isLoading, error } = useSWR<AdminStatsOut>("admin:stats", adminStatsApi.get);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-semibold text-fg flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Espace administrateur
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Vue d&apos;ensemble du système : comptes, catalogue, sessions et affectations.
        </p>
      </div>
      <SeedDemoCard />
      <AdminStatsCards stats={data} isLoading={isLoading} error={Boolean(error)} />
    </div>
  );
}
