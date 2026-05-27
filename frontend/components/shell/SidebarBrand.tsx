import Link from "next/link";
import { cn } from "@/lib/utils";

export function SidebarBrand({
  homeHref,
  collapsed = false,
}: {
  homeHref: string;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={homeHref}
      className={cn(
        "flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-primary",
        collapsed ? "justify-center" : "w-full pl-7 pr-3"
      )}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground font-display italic text-lg">
        P
      </span>
      {!collapsed && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-fg">ProfMatch</span>
          <span className="text-[11px] tracking-wide text-fg-subtle">Collège La Cité</span>
        </span>
      )}
    </Link>
  );
}
