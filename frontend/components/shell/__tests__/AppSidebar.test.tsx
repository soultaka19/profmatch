import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { AppSidebar } from "../AppSidebar";
import { toast } from "sonner";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/prof" }));

const logout = vi.fn();
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "p@x.com", nom_complet: "Jean", role: "prof" },
    logout,
  }),
}));
vi.mock("sonner", () => ({
  toast: { info: vi.fn() },
}));

describe("AppSidebar", () => {
  it("rend le brand + tous les items de toutes les sections", () => {
    const nav = [
      {
        label: "Espace prof",
        items: [
          { href: "/dashboard/prof", label: "Mon CV", icon: FileText },
          { href: "/dashboard/prof/affectations", label: "Mes affectations", icon: FileText, disabled: true },
        ],
      },
    ];

    render(<AppSidebar navigation={nav} />);

    expect(screen.getByText("ProfMatch")).toBeInTheDocument();
    expect(screen.getByText("Collège La Cité")).toBeInTheDocument();
    expect(screen.getByText("Espace prof")).toBeInTheDocument();
    expect(screen.getByText("Mon CV")).toBeInTheDocument();
    expect(screen.getByText("Mes affectations")).toBeInTheDocument();
  });

  it("présente une section indisponible sans date de livraison", () => {
    render(
      <AppSidebar
        navigation={[{
          label: "Espace prof",
          items: [{ href: "/dashboard/prof/affectations", label: "Mes affectations", icon: FileText, disabled: true }],
        }]}
      />
    );

    expect(screen.getByText("Bientôt")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Mes affectations"));
    expect(toast.info).toHaveBeenCalledWith(
      "Cette section est bientôt disponible.",
      expect.not.objectContaining({ description: expect.stringContaining("4 juin") })
    );
  });

  it("expose une action de déconnexion explicite distincte de l'identité", () => {
    render(<AppSidebar navigation={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(logout).toHaveBeenCalled();
  });
});
