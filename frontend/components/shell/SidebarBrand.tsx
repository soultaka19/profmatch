import Link from "next/link";

export function SidebarBrand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      className="flex items-center gap-2 px-1 py-1 outline-none rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-display italic text-base">
        P
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-fg">ProfMatch</span>
        <span className="text-[10px] tracking-wider text-fg-subtle">Collège La Cité</span>
      </span>
    </Link>
  );
}
