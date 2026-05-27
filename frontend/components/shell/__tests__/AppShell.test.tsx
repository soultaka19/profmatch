import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IconHome, IconClipboardList, IconWand } from "@tabler/icons-react";
import { AppShell } from "../AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/rh/affectations",
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "rh@test.ca", nom_complet: "RH", role: "rh" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/theme/ThemeProvider", () => ({
  useTheme: () => ({ theme: "vertSapin", setTheme: vi.fn(), setThemeForRole: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const rhNavigation = [
  {
    label: "Affectations",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: IconHome },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: IconWand },
      { href: "/dashboard/rh/historique", label: "Historique", icon: IconClipboardList },
    ],
  },
];

describe("AppShell", () => {
  it("dérive le breadcrumb depuis la route active", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(screen.getAllByText("Générer affectations")).toHaveLength(2);
  });

  it("expose un bouton de menu mobile accessible", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(
      screen.getByRole("button", { name: /ouvrir le menu/i })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("ouvre un tiroir mobile unique et permet de le fermer", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    expect(container.querySelectorAll("#app-mobile-sidebar")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: /navigation principale/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fermer le menu/i }));
    expect(container.querySelector("#app-mobile-sidebar")).not.toBeInTheDocument();
  });

  it("ferme le tiroir mobile avec la touche Escape", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord">
        <div>Contenu RH</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector("#app-mobile-sidebar")).not.toBeInTheDocument();
  });
});
