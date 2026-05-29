import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTableControls } from "./useTableControls";

interface Row { code: string; nom: string; }
const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  code: `C${i}`,
  nom: i === 0 ? "Algorithmes" : `Cours ${i}`,
}));
const match = (r: Row, q: string) =>
  (r.code + r.nom).toLowerCase().includes(q.toLowerCase());

describe("useTableControls", () => {
  it("pagine 5 par défaut", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    expect(result.current.pageSize).toBe(5);
    expect(result.current.pageItems).toHaveLength(5);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.total).toBe(12);
  });

  it("change de page", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toHaveLength(2);
  });

  it("filtre par recherche et revient page 1", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(2));
    act(() => result.current.setQuery("Algorithmes"));
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems[0].nom).toBe("Algorithmes");
  });

  it("réinitialise la page quand pageSize change", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(3));
    act(() => result.current.setPageSize(10));
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toHaveLength(10);
  });
});
