import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopbarAction } from "../TopbarAction";

describe("TopbarAction", () => {
  it("affiche une action contextuelle dans le slot reserve de la topbar", async () => {
    const { container } = render(
      <>
        <div id="app-topbar-page-action" />
        <TopbarAction>
          <button type="button">Nouvelle generation</button>
        </TopbarAction>
      </>
    );

    const action = await screen.findByRole("button", { name: "Nouvelle generation" });
    expect(container.querySelector("#app-topbar-page-action")).toContainElement(action);
  });
});
