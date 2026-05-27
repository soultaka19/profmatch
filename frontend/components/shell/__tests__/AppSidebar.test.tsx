import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IconFileText } from "@tabler/icons-react";
import { AppSidebar } from "../AppSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/prof" }));

// Mock AuthProvider — évite l'accès à localStorage dans le test
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "p@x.com", nom_complet: "Jean Dupont", role: "prof" },
    logout: vi.fn(),
    login: vi.fn(),
    isLoading: false,
  }),
}));

describe("AppSidebar", () => {
  it("rend le brand + tous les items de toutes les sections", () => {
    const nav = [
      {
        label: "Mon espace",
        items: [
          { href: "/dashboard/prof", label: "Mon CV", icon: IconFileText },
          { href: "/dashboard/prof/affectations", label: "Mes affectations", icon: IconFileText, disabled: true },
        ],
      },
    ];

    render(<AppSidebar navigation={nav} />);

    expect(screen.getByText("ProfMatch")).toBeInTheDocument();
    expect(screen.getByText("Collège La Cité")).toBeInTheDocument();
    expect(screen.getByText("Mon espace")).toBeInTheDocument();
    expect(screen.getByText("Mon CV")).toBeInTheDocument();
    expect(screen.getByText("Mes affectations")).toBeInTheDocument();
  });
});
