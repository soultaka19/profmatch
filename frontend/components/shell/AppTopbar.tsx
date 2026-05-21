"use client";

import { type ReactNode } from "react";

interface Props {
  breadcrumb: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppTopbar({ breadcrumb, subtitle, actions }: Props) {
  return (
    <div className="flex h-[68px] flex-shrink-0 items-center gap-6 border-b border-border bg-canvas px-10">
      <div className="flex flex-col">
        <div className="text-base font-semibold text-fg">{breadcrumb}</div>
        {subtitle && <div className="text-xs text-fg-subtle">{subtitle}</div>}
      </div>
      <div className="flex-1" />
      {actions}
    </div>
  );
}
