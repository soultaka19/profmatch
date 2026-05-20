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
    "relative flex items-center gap-3 pl-6 pr-4 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

  const stateClasses = active
    ? "bg-primary-soft text-primary font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary before:content-['']"
    : "text-fg-muted hover:bg-primary-soft hover:text-fg";

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        data-active="false"
        className={cn(
          baseClasses,
          "w-full text-left text-fg hover:bg-primary-soft"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
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
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "opacity-80")} />
      <span>{label}</span>
    </Link>
  );
}
