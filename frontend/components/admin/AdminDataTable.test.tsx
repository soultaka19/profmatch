import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AdminTableEmpty,
  AdminTableLoading,
  AdminTableShell,
  AdminTableToolbar,
} from "./AdminDataTable";

describe("AdminDataTable", () => {
  it("cadre une liste de gestion avec un compteur et des filtres", () => {
    render(
      <>
        <AdminTableToolbar countLabel="3 programmes">
          <input aria-label="Rechercher" />
        </AdminTableToolbar>
        <AdminTableShell>
          <table aria-label="Programmes" />
        </AdminTableShell>
      </>
    );

    expect(screen.getByText("3 programmes")).toBeInTheDocument();
    expect(screen.getByLabelText("Rechercher")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Programmes" }).parentElement).toHaveClass(
      "overflow-x-auto"
    );
  });

  it("fournit des etats de chargement et vide homogenes", () => {
    render(
      <>
        <AdminTableLoading />
        <AdminTableEmpty title="Aucun cours" description="Modifiez vos filtres." />
      </>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    expect(screen.getByText("Aucun cours")).toBeInTheDocument();
    expect(screen.getByText("Modifiez vos filtres.")).toBeInTheDocument();
  });
});
