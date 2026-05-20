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
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

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
        <Icon className="h-[18px] w-[18px] opacity-70" />
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
      <Icon className={cn("h-[18px] w-[18px]", active ? "opacity-100" : "opacity-70")} />
      <span>{label}</span>
    </Link>
  );
}
