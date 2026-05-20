import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { AppSidebar } from "../AppSidebar";
import { AuthProvider } from "@/components/auth/AuthProvider";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/prof" }));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({ id: 1, email: "p@x.com", nom_complet: "Jean", role: "prof" }),
  },
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

    render(
      <AuthProvider>
        <AppSidebar navigation={nav} />
      </AuthProvider>
    );

    expect(screen.getByText("ProfMatch")).toBeInTheDocument();
    expect(screen.getByText("Collège La Cité")).toBeInTheDocument();
    expect(screen.getByText("Espace prof")).toBeInTheDocument();
    expect(screen.getByText("Mon CV")).toBeInTheDocument();
    expect(screen.getByText("Mes affectations")).toBeInTheDocument();
  });
});
