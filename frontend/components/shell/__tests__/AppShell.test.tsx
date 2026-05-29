import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Home, ListChecks, Sparkles } from "lucide-react";
import { AppShell } from "../AppShell";

afterEach(() => localStorage.clear());

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/rh/affectations",
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "rh@test.ca", nom_complet: "RH", role: "rh" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/theme/ThemeSwitcher", () => ({
  ThemeSwitcher: () => <button type="button">Thème</button>,
}));

// SidebarUserCard consomme useConfirm ; ce shell test ne couvre pas la
// confirmation, on neutralise le hook (sinon il exige un ConfirmProvider).
vi.mock("@/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => () => Promise.resolve(true),
}));

const rhNavigation = [
  {
    label: "Ressources humaines",
    items: [
      { href: "/dashboard/rh", label: "Tableau de bord", icon: Home },
      { href: "/dashboard/rh/affectations", label: "Générer affectations", icon: Sparkles },
      { href: "/dashboard/rh/historique", label: "Historique", icon: ListChecks },
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

  it("affiche le contexte d'espace dans la topbar et la sidebar", () => {
    render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord" sectionLabel="Ressources humaines">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(screen.getAllByText("Ressources humaines")).toHaveLength(2);
  });

  it("utilise une largeur large pour les écrans de données", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord" contentWidth="wide">
        <div>Contenu RH</div>
      </AppShell>
    );

    expect(container.querySelector("main > div")).toHaveClass("max-w-[1360px]");
  });

  it("replie la sidebar en icônes, masque les libellés et étire le contenu", () => {
    const { container } = render(
      <AppShell navigation={rhNavigation} breadcrumb="Tableau de bord" sectionLabel="Ressources humaines">
        <div>Contenu RH</div>
      </AppShell>
    );

    const content = container.querySelector("main > div");
    expect(screen.getAllByText("Ressources humaines")).toHaveLength(2);
    // Déployé : largeur plafonnée (route affectations -> wide).
    expect(content).toHaveClass("max-w-[1360px]");

    fireEvent.click(screen.getByRole("button", { name: "Réduire le menu" }));

    expect(screen.getByRole("button", { name: "Déployer le menu" })).toBeInTheDocument();
    // Le libellé de section disparaît de la sidebar (reste seulement dans la topbar).
    expect(screen.getAllByText("Ressources humaines")).toHaveLength(1);
    // Replié : le contenu s'étire pour occuper l'espace disponible.
    expect(content).toHaveClass("max-w-none");
    expect(content).not.toHaveClass("max-w-[1360px]");
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
