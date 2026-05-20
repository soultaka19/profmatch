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
  onDisabledClick?: () => void;
}

export function SidebarNavItem({ href, label, icon: Icon, disabled, onDisabledClick }: Props) {
  const pathname = usePathname();
  const active = !disabled && pathname === href;

  const baseClasses =
    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  const stateClasses = active
    ? "bg-primary text-primary-foreground font-medium shadow-active"
    : "text-fg-muted hover:bg-white/60";

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        data-active="false"
        className={cn(baseClasses, "text-fg-subtle hover:bg-white/60 text-left w-full")}
      >
        <Icon className="h-4 w-4 opacity-70" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      data-active={active ? "true" : "false"}
      className={cn(baseClasses, stateClasses)}
    >
      <Icon className={cn("h-4 w-4", active ? "opacity-100" : "opacity-70")} />
      <span>{label}</span>
    </Link>
  );
}
