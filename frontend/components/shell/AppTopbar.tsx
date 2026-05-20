"use client";

import { type ReactNode } from "react";

interface Props {
  breadcrumb: string;
  actions?: ReactNode;
}

export function AppTopbar({ breadcrumb, actions }: Props) {
  return (
    <div className="flex h-[64px] flex-shrink-0 items-center gap-4 border-b border-border bg-canvas px-10">
      <div className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-primary">
        {breadcrumb}
      </div>
      <div className="flex-1" />
      {actions}
    </div>
  );
}
