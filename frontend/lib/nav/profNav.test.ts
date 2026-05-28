import { describe, expect, it } from "vitest";
import { profNav } from "./profNav";

describe("profNav", () => {
  it("active la navigation vers Mes affectations", () => {
    const item = profNav
      .flatMap((section) => section.items)
      .find((navItem) => navItem.href === "/dashboard/prof/affectations");

    expect(item?.label).toBe("Mes affectations");
    expect(item?.disabled).not.toBe(true);
  });
});
