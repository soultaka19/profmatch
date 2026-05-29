import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

export interface TableControls<T> {
  query: string;
  setQuery: (q: string) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  page: number;
  setPage: (n: number) => void;
  pageItems: T[];
  total: number;
  pageCount: number;
}

/**
 * Recherche + pagination côté client. Volumes de démo faibles : filtrage et
 * découpage en mémoire (useMemo). `match(item, query)` est fourni par chaque
 * domaine (ex. cours → code+nom). La page revient à 1 dès que la recherche ou
 * la taille de page change.
 */
export function useTableControls<T>(
  items: T[],
  match: (item: T, query: string) => boolean,
  defaultPageSize = 5,
): TableControls<T> {
  const [query, setQueryState] = useState("");
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const setQuery = (q: string) => {
    setQueryState(q);
    setPage(1);
  };
  const setPageSize = (n: number) => {
    setPageSizeState(n);
    setPage(1);
  };

  const filtered = useMemo(
    () => (query.trim() ? items.filter((it) => match(it, query.trim())) : items),
    [items, query, match],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    query, setQuery, pageSize, setPageSize,
    page: safePage, setPage, pageItems, total, pageCount,
  };
}
