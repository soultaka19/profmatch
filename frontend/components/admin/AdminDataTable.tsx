import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/useTableControls";

export function AdminTableToolbar({
  children,
  countLabel,
}: {
  children?: ReactNode;
  countLabel: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-canvas-pure p-3 sm:flex-row sm:items-center">
      <p className="text-sm font-medium text-fg-muted">{countLabel}</p>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function AdminTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-canvas-pure shadow-sm">
      {children}
    </div>
  );
}

export function AdminTableLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-border bg-canvas-pure px-4 py-12 text-center text-sm text-fg-muted"
    >
      Chargement...
    </div>
  );
}

export function AdminTableEmpty({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-canvas-pure px-4 py-12 text-center">
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
    </div>
  );
}

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <Input
      type="search"
      aria-label={label}
      className="w-full sm:w-72"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (n: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 text-sm text-fg-muted sm:flex-row">
      <div className="flex items-center gap-2">
        <span>Par page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]" aria-label="Lignes par page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span aria-live="polite">{from}–{to} sur {total}</span>
        <Button
          size="sm" variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >Précédent</Button>
        <Button
          size="sm" variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >Suivant</Button>
      </div>
    </div>
  );
}
