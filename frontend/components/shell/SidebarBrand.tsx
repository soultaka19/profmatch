import Link from "next/link";

export function SidebarBrand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      className="flex w-full items-center gap-3 pl-7 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground text-body-sm font-semibold">
        P
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-fg">ProfMatch</span>
        <span className="text-[11px] tracking-wide text-fg-subtle">Collège La Cité</span>
      </span>
    </Link>
  );
}
