import type { ReactNode } from "react";

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
