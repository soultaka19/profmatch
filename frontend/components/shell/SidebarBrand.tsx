import Link from "next/link";

export function SidebarBrand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      className="flex items-center gap-3 pl-6 pr-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display italic text-lg shadow-active">
        P
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-fg">ProfMatch</span>
        <span className="text-[11px] tracking-wide text-fg-subtle">Collège La Cité</span>
      </span>
    </Link>
  );
}
