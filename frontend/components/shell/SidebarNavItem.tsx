"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  collapsed?: boolean;
  onDisabledClick?: () => void;
  onNavigate?: () => void;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  disabled,
  collapsed = false,
  onDisabledClick,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const active = !disabled && pathname === href;

  const baseClasses = cn(
    "relative flex items-center gap-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
    collapsed ? "justify-center px-0" : "pl-7 pr-5"
  );

  const stateClasses = active
    ? "bg-primary-soft text-primary font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary before:content-['']"
    : "text-fg-muted hover:bg-primary-soft hover:text-fg";

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        data-active="false"
        title={collapsed ? label : undefined}
        className={cn(
          baseClasses,
          "w-full text-left text-fg hover:bg-primary-soft"
        )}
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0 text-fg-subtle" />
        <span className={cn("text-fg-muted", collapsed && "sr-only")}>{label}</span>
        {!collapsed && (
          <span className="ml-auto rounded-full border border-border bg-canvas-pure px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
            Bientôt
          </span>
        )}
      </button>
    );
  }

  return (
    <Link
      href={href}
      data-active={active ? "true" : "false"}
      title={collapsed ? label : undefined}
      className={cn(baseClasses, stateClasses)}
      onClick={onNavigate}
    >
      <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "text-primary" : "opacity-80")} />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}
