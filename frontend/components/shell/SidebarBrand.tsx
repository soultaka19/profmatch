import Link from "next/link";

export function SidebarBrand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      className="flex w-full items-center gap-3 pl-5 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* Logo carré "LC" */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-white/15 font-display italic text-[15px] font-bold text-white">
        LC
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold text-sidebar-fg">ProfMatch</span>
        <span className="text-[11px] tracking-wide text-sidebar-fg-muted">
          Collège La Cité
        </span>
      </span>
    </Link>
  );
}
