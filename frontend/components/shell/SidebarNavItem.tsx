"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavIcon } from "@/lib/nav/types";

interface Props {
  href: string;
  label: string;
  icon: NavIcon;
  disabled?: boolean;
  onDisabledClick?: () => void;
  onNavigate?: () => void;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  disabled,
  onDisabledClick,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const active = !disabled && pathname === href;

  const base =
    "relative flex items-center gap-3 mx-2 px-3 py-2 rounded-[8px] text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40";

  const stateClasses = active
    ? "bg-sidebar-item-active text-white font-medium"
    : "text-sidebar-fg-muted hover:bg-sidebar-item-hover hover:text-sidebar-fg";

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        className={cn(base, "w-full text-left text-sidebar-fg-muted/60 cursor-default")}
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0 opacity-50" size={18} stroke={1.6} />
        <span className="opacity-60">{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      data-active={active ? "true" : "false"}
      className={cn(base, stateClasses)}
      onClick={onNavigate}
    >
      <Icon
        className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "opacity-100" : "opacity-70")}
        size={18}
        stroke={1.6}
      />
      <span>{label}</span>
    </Link>
  );
}
