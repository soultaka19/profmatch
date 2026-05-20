import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { SidebarNavItem } from "../SidebarNavItem";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

import { usePathname } from "next/navigation";

describe("SidebarNavItem", () => {
  it("marque l'item comme actif si href === pathname", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/dashboard/prof");
    render(<SidebarNavItem href="/dashboard/prof" label="Mon CV" icon={FileText} />);
    const link = screen.getByRole("link", { name: /Mon CV/i });
    expect(link).toHaveAttribute("data-active", "true");
  });

  it("ne marque pas actif si href !== pathname", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/dashboard/rh");
    render(<SidebarNavItem href="/dashboard/prof" label="Mon CV" icon={FileText} />);
    expect(screen.getByRole("link")).toHaveAttribute("data-active", "false");
  });

  it("rend un button non-cliquable si disabled, déclenche onDisabledClick", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/dashboard/prof");
    const onDisabled = vi.fn();
    render(
      <SidebarNavItem
        href="/dashboard/prof/x"
        label="Bientôt"
        icon={FileText}
        disabled
        onDisabledClick={onDisabled}
      />
    );
    const btn = screen.getByRole("button", { name: /Bientôt/i });
    btn.click();
    expect(onDisabled).toHaveBeenCalledOnce();
  });
});
